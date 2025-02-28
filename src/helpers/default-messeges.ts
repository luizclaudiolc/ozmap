import i18next from 'i18next';

export const STATUS = {
  OK: 200,
  CREATED: 201,
  UPDATED: 204,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  DEFAULT_ERROR: 400,
};

export const MESSAGE_KEYS = {
  // Usuários
  USER_NOT_FOUND: 'user.notFound',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  
  // Regiões
  REGION_NOT_FOUND: 'region.notFound',
  REGION_CREATED: 'region.created',
  REGION_UPDATED: 'region.updated',
  REGION_DELETED: 'region.deleted',
  INVALID_POLYGON: 'region.invalidPolygon',
  
  // Erros do servidor
  INVALID_DATA: 'error.invalidData',
  SERVER_ERROR: 'error.server',
  
  // Validações de modelo
  ADDRESS_OR_COORDINATES: 'validation.addressOrCoordinates',
  INVALID_GEOJSON_POINT: 'validation.invalidGeoJsonPoint',
  INVALID_GEOJSON_POLYGON: 'validation.invalidGeoJsonPolygon',
  
  // Erros de geo
  ADDRESS_NOT_FOUND: 'geo.addressNotFound',
  ADDRESS_NOT_VALID: 'geo.addressNotValid',
  COORDINATES_NOT_FOUND: 'geo.coordinatesNotFound',
  COORDINATES_NOT_VALID: 'geo.coordinatesNotValid',
  GEO_ERROR: 'geo.error',
  TIMEOUT: 'geo.timeout'
};

export const setupI18n = (lng = 'en-US') => {
  i18next.init({
    lng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    resources: {
      'pt-BR': {
        translation: {
          user: {
            notFound: 'Usuário não encontrado',
            created: 'Usuário criado com sucesso',
            updated: 'Usuário atualizado com sucesso',
            deleted: 'Usuário deletado com sucesso'
          },
          region: {
            notFound: 'Região não encontrada',
            created: 'Região criada com sucesso',
            updated: 'Região atualizada com sucesso',
            deleted: 'Região deletada com sucesso',
            invalidPolygon: 'Polígono inválido'
          },
          error: {
            invalidData: 'Dados inválidos',
            server: 'Erro interno no servidor'
          },
          validation: {
            addressOrCoordinates: 'Endereço ou coordenadas devem ser fornecidos',
            invalidGeoJsonPoint: 'Ponto GeoJSON inválido',
            invalidGeoJsonPolygon: 'Polígono GeoJSON inválido'
          },
          geo: {
            addressNotFound: 'Endereço não encontrado',
            AddressNotValid: 'Endereço inválido ou vazio',
            coordinatesNotFound: 'Coordenadas não encontradas',
            coordinatesNotValid: 'Coordenadas devem ser números válidos',
            error: 'Erro ao buscar coordenadas',
            timeout: 'Tempo de requisição excedido'
          }
        }
      },
      'en': {
        translation: {
          user: {
            notFound: 'User not found',
            created: 'User created successfully',
            updated: 'User updated successfully',
            deleted: 'User deleted successfully'
          },
          region: {
            notFound: 'Region not found',
            created: 'Region created successfully',
            updated: 'Region updated successfully',
            deleted: 'Region deleted successfully',
            invalidPolygon: 'Invalid polygon'
          },
          error: {
            invalidData: 'Invalid data',
            server: 'Internal server error'
          },
          validation: {
            addressOrCoordinates: 'Address or coordinates must be provided',
            invalidGeoJsonPoint: 'Invalid GeoJSON point',
            invalidGeoJsonPolygon: 'Invalid GeoJSON polygon'
          },
          geo: {
            addressNotFound: 'Address not found',
            addressNotValid: 'Invalid or empty address',
            coordinatesNotFound: 'Coordinates not found',
            coordinatesNotValid: 'Coordinates must be valid numbers',
            error: 'Error fetching coordinates',
            timeout: 'Request timeout exceeded'
          }
        }
      },
      'es': {
        translation: {
          user: {
            notFound: 'Usuario no encontrado',
            created: 'Usuario creado con éxito',
            updated: 'Usuario actualizado con éxito',
            deleted: 'Usuario eliminado con éxito'
          },
          region: {
            notFound: 'Región no encontrada',
            created: 'Región creada con éxito',
            updated: 'Región actualizada con éxito',
            deleted: 'Región eliminada con éxito',
            invalidPolygon: 'Polígono inválido'
          },
          error: {
            invalidData: 'Datos inválidos',
            server: 'Error interno del servidor'
          },
          validation: {
            addressOrCoordinates: 'Se debe proporcionar dirección o coordenadas',
            invalidGeoJsonPoint: 'Punto GeoJSON inválido',
            invalidGeoJsonPolygon: 'Polígono GeoJSON inválido'
          },
          geo: {
            addressNotFound: 'Dirección no encontrada',
            addressNotValid: 'Dirección inválida o vacía',
            coordinatesNotFound: 'Coordenadas no encontradas',
            coordinatesNotValid: 'Las coordenadas deben ser números válidos',
            error: 'Error al buscar coordenadas',
            timeout: 'Tiempo de solicitud excedido'
          }
        }
      }
    }
  });
  
  return i18next;
};

export const t = (key: string, options = {}): string => {
  return i18next.t(key, options);
};

export const changeLanguage = (lng: string): void => {
  i18next.changeLanguage(lng);
};

export const getCurrentLanguage = (): string => {
  return i18next.language;
};

export const SERVER_MESSAGES = {
  USER_NOT_FOUND: () => t(MESSAGE_KEYS.USER_NOT_FOUND),
  REGION_NOT_FOUND: () => t(MESSAGE_KEYS.REGION_NOT_FOUND),
  INVALID_DATA: () => t(MESSAGE_KEYS.INVALID_DATA),
  SERVER_ERROR: () => t(MESSAGE_KEYS.SERVER_ERROR),
  USER_CREATED: () => t(MESSAGE_KEYS.USER_CREATED),
  USER_UPDATED: () => t(MESSAGE_KEYS.USER_UPDATED),
  USER_DELETED: () => t(MESSAGE_KEYS.USER_DELETED),
  REGION_CREATED: () => t(MESSAGE_KEYS.REGION_CREATED),
  REGION_UPDATED: () => t(MESSAGE_KEYS.REGION_UPDATED),
  REGION_DELETED: () => t(MESSAGE_KEYS.REGION_DELETED),
  INVALID_POLYGON: () => t(MESSAGE_KEYS.INVALID_POLYGON),
};

export const MODELS_ERROR_MESSAGES = {
  ADDRESS_OR_COORDINATES: () => t(MESSAGE_KEYS.ADDRESS_OR_COORDINATES),
  USER_NOT_FOUND: () => t(MESSAGE_KEYS.USER_NOT_FOUND),
  INVALID_GEOJSON_POINT: () => t(MESSAGE_KEYS.INVALID_GEOJSON_POINT),
  INVALID_GEOJSON_POLYGON: () => t(MESSAGE_KEYS.INVALID_GEOJSON_POLYGON),
};

export const GEO_ERROR_MESSAGES = {
  ADDRESS_NOT_FOUND: () => t(MESSAGE_KEYS.ADDRESS_NOT_FOUND),
  ADDRESS_NOT_VALID: () => t(MESSAGE_KEYS.ADDRESS_NOT_VALID),
  COORDINATES_NOT_FOUND: () => t(MESSAGE_KEYS.COORDINATES_NOT_FOUND),
  COORDINATES_NOT_VALID: () => t(MESSAGE_KEYS.COORDINATES_NOT_VALID),
  GEO_ERROR: () => t(MESSAGE_KEYS.GEO_ERROR),
  TIMEOUT: () => t(MESSAGE_KEYS.TIMEOUT),
};

setupI18n();