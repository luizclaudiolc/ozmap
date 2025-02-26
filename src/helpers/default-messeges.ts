export const STATUS = {
  OK: 200,
  CREATED: 201,
  UPDATED: 201,
  NOT_FOUND: 400,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  DEFAULT_ERROR: 418,
};

export const SERVER_MESSAGES = {
  USER_NOT_FOUND: 'Usuário não encontrado',
  REGION_NOT_FOUND: 'Região não encontrada',
  INVALID_DATA: 'Dados inválidos',
  SERVER_ERROR: 'Erro interno no servidor',
  USER_CREATED: 'Usuário criado com sucesso',
  USER_UPDATED: 'Usuário atualizado com sucesso',
  USER_DELETED: 'Usuário deletado com sucesso',
  REGION_CREATED: 'Região criada com sucesso',
  REGION_UPDATED: 'Região atualizada com sucesso',
  REGION_DELETED: 'Região deletada com sucesso',
  INVALID_POLYGON: 'Polígono inválido',
};

export const MODELS_ERROR_MESSAGES = {
  ADDRESS_OR_COORDINATES: 'Endereço ou coordenadas devem ser fornecidos.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  INVALID_GEOJSON_POINT: 'Ponto GeoJSON inválido.',
  INVALID_GEOJSON_POLYGON: 'Polígono GeoJSON inválido.',
};

export const GEO_ERROR_MESSAGES = {
  ADDRESS_NOT_FOUND: 'Endereço não encontrado',
  COORDINATES_NOT_FOUND: 'Coordenadas não encontradas',
  COORDINATES_NOT_VALID: 'Coordenadas devem ser números válidos',
  GEO_ERROR: 'Erro ao buscar coordenadas',
  TIMEOUT: 'Tempo de requisição excedido',
};
