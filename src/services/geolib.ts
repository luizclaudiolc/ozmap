import { ICoordinates } from '../interfaces/all.interfaces';
import { GEO_ERROR_MESSAGES } from '../helpers/default-messeges';
import { GeoError, NominatimService } from './geo.service';

class GeoLib {
  private geoService: NominatimService;

  constructor(geoService?: NominatimService) {
    this.geoService = geoService || new NominatimService();
  }

  public async getAddressFromCoordinates(
    coordinates: [number, number] | ICoordinates
  ): Promise<string> {
    try {
      const { lat, lng } = this.normalizeCoordinates(coordinates);
      this.validateCoordinates(lat, lng);

      const data = await this.geoService.reverseGeocode(lat, lng);

      if (!data.display_name) {
        throw new GeoError(GEO_ERROR_MESSAGES.ADDRESS_NOT_FOUND());
      }

      return data.display_name;
    } catch (error) {
      this.handleError(GEO_ERROR_MESSAGES.ADDRESS_NOT_FOUND(), error);
      throw new GeoError(GEO_ERROR_MESSAGES.GEO_ERROR());
    }
  }

  public async getCoordinatesFromAddress(
    address: string
  ): Promise<ICoordinates> {
    try {
      const data = await this.geoService.searchAddress(address);

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

  private handleError(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${context}: ${errorMessage}`);
  }
}

// Exporta instância singleton do GeoLib (forma original)
export default new GeoLib();

// Alternativamente, você também pode exportar a classe para permitir injeção de dependência em testes
export { GeoLib, GeoError };
