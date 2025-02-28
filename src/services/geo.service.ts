import fetch from 'node-fetch';
import {
  INominatimReverseResponse,
  INominatimSearchResponse,
} from '../interfaces/all.interfaces';
import { GEO_ERROR_MESSAGES } from '../helpers/default-messeges';

const REQUEST_TIMEOUT = 10000;

export class GeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoError';
  }
}

export class NominatimService {
  private readonly baseUrl: string;

  constructor(baseUrl = 'https://nominatim.openstreetmap.org') {
    this.baseUrl = baseUrl;
  }

  public async searchAddress(
    address: string
  ): Promise<INominatimSearchResponse[]> {
    if (!address || address.trim() === '') {
      throw new GeoError(GEO_ERROR_MESSAGES.ADDRESS_NOT_VALID());
    }

    const url = `${this.baseUrl}/search?q=${encodeURIComponent(
      address
    )}&format=json&limit=1`;
    return this.fetchWithTimeout<INominatimSearchResponse[]>(url);
  }

  public async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<INominatimReverseResponse> {
    const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lon}&format=json`;
    return this.fetchWithTimeout<INominatimReverseResponse>(url);
  }

  private async fetchWithTimeout<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GeoLib/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(GEO_ERROR_MESSAGES.GEO_ERROR());
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(GEO_ERROR_MESSAGES.TIMEOUT());
      }

      throw error;
    }
  }
}
