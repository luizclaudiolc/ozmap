import fetch from 'node-fetch';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

class GeoLib {
  /**
   * Obtém um endereço a partir de coordenadas (latitude e longitude).
   * @param coordinates Coordenadas no formato [longitude, latitude] ou { lat, lng }.
   * @returns Endereço correspondente às coordenadas.
   */
  public async getAddressFromCoordinates(
    coordinates: [number, number] | { lat: number; lng: number }
  ): Promise<string> {
    try {
      let lat: number, lng: number;
      console.log('coordinates:', coordinates);
      

      if (Array.isArray(coordinates)) {
        [lng, lat] = coordinates; 
      } else {
        ({ lat, lng } = coordinates);
      }

      const response = await fetch(`${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json() as any;

      if (!data.display_name) {
        throw new Error('Endereço não encontrado');
      }

      return data.display_name;
    } catch (error) {
      console.error('Erro ao obter endereço:', error);
      throw new Error('Falha ao buscar endereço');
    }
  }

  /**
   * Obtém coordenadas (latitude e longitude) pelo endereço.
   * @param address Endereço a ser convertido.
   * @returns Coordenadas { lat, lng } do endereço informado.
   */
  public async getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number }> {
    try {
      const response = await fetch(`${NOMINATIM_URL}/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await response.json() as any;

      if (!data.length) {
        throw new Error('Endereço não encontrado');
      }

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } catch (error) {
      console.error('Erro ao obter coordenadas:', error);
      throw new Error('Falha ao buscar coordenadas');
    }
  }
}

export default new GeoLib();
