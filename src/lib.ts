import fetch from 'node-fetch';
import { ICoordinates, INominatimReverseResponse, INominatimSearchResponse } from './interfaces/all.interfaces';
import { GEO_ERROR_MESSAGES } from './helpers/default-messeges';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const REQUEST_TIMEOUT = 10000;

class GeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoError';
  }
}

class GeoLib {
  public async getAddressFromCoordinates(
    coordinates: [number, number] | ICoordinates
  ): Promise<string> {
    try {
      const { lat, lng } = this.normalizeCoordinates(coordinates);
            
      this.validateCoordinates(lat, lng);
      
      const url = `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=json`;
      const data = await this.fetchWithTimeout<INominatimReverseResponse>(url);
      
      if (!data.display_name) {
        throw new GeoError(GEO_ERROR_MESSAGES.ADDRESS_NOT_FOUND());
      }
      
      return data.display_name;
    } catch (error) {
      this.handleError(GEO_ERROR_MESSAGES.ADDRESS_NOT_FOUND(), error);
      throw new Error(GEO_ERROR_MESSAGES.GEO_ERROR());
    }
  }

  public async getCoordinatesFromAddress(address: string): Promise<ICoordinates> {
    try {
      if (!address || address.trim() === '') {
        throw new GeoError('Endereço não pode ser vazio');
      }

       const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
       const data = await this.fetchWithTimeout<INominatimSearchResponse[]>(url);
       
       if (!data.length || !data[0].lat || !data[0].lon) {
         throw new GeoError(GEO_ERROR_MESSAGES.COORDINATES_NOT_FOUND());
       }
       
       return {
         lat: parseFloat(data[0].lat),
         lng: parseFloat(data[0].lon),
       };
     } catch (error) {
       this.handleError(GEO_ERROR_MESSAGES.COORDINATES_NOT_FOUND(), error);
       throw new GeoError(GEO_ERROR_MESSAGES.GEO_ERROR());
     }
  }

  private normalizeCoordinates(
    coordinates: [number, number] | ICoordinates
  ): ICoordinates {
    if (Array.isArray(coordinates)) {
      const [lng, lat] = coordinates;
      return { lat, lng };
    }
    return coordinates;
  }

  private validateCoordinates(lat: number, lng: number): void {
    console.log('Coordinates:', { lat, lng });
    
    if (isNaN(lat) || isNaN(lng)) {
      throw new GeoError(GEO_ERROR_MESSAGES.COORDINATES_NOT_VALID());
    }
  }

  private async fetchWithTimeout<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GeoLib/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(GEO_ERROR_MESSAGES.GEO_ERROR());
      }
      
      return await response.json() as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(GEO_ERROR_MESSAGES.TIMEOUT());
      }
      
      throw error;
    }
  }

  private handleError(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${context}: ${errorMessage}`);
  }
  
}

export default new GeoLib();
