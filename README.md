# OZmap

OZmap é uma API RESTful construída em Node.js com TypeScript que permite gerenciar usuários e suas localizações geográficas utilizando o padrão GeoJSON. O projeto integra MongoDB (via Mongoose) e implementa internacionalização (i18next) para mensagens multilíngues.

---

## Funcionalidades

- **Gerenciamento de Usuários**
  - **Criar Usuário** (`POST /users`): Cria um novo usuário com nome, e-mail, coordenadas (no formato GeoJSON) e regiões associadas.
  - **Listar Usuários** (`GET /users`): Retorna uma lista com todos os usuários cadastrados.
  - **Detalhar Usuário** (`GET /users/:id`): Retorna os detalhes de um usuário específico, identificado pelo seu ID.
  - **Atualizar Usuário** (`PUT /users/:id`): Atualiza os dados de um usuário.
  - **Remover Usuário** (`DELETE /users/:id`): Remove um usuário do sistema.

- **Gerenciamento de Regiões**
  - **Criar Região** (`POST /regions`): Cria uma nova região.
  - **Listar Regiões** (`GET /regions`): Retorna todas as regiões cadastradas.
  - **Detalhar Região** (`GET /regions/:id`): Exibe detalhes de uma região específica.
  - **Atualizar Região** (`PUT /regions/:id`): Atualiza as informações de uma região.
  - **Remover Região** (`DELETE /regions/:id`): Remove uma região.
  - **Buscar Ponto em Região** (`GET /regions/contains`): Rotorna  se um ponto especificado por coordenadas (latitude e longitude) está contido dentro de uma região armazenada no banco de dados.
  - **Busca Região por distância** (`GET /regions/near`):  Encontrar regiões próximas a um ponto específico definido por coordenadas de latitude e longitude, dentro de uma determinada distância.

- **Geolocalização**
  - Validação e armazenamento de pontos geográficos no padrão GeoJSON (tipo `Point` com coordenadas em formato `[longitude, latitude]`).
  - Busca reversa de endereços a partir de coordenadas através de integrações com APIs de geocodificação.

- **Internacionalização**
  - Mensagens de erro e sucesso traduzidas para vários idiomas (pt-BR, en, es) utilizando i18next.

---

## Pré-requisitos

- **Node.js**: Versão 20 ou superior.
- **npm** ou **pnpm**
- **Docker
- **MongoDB**: Caso opte por não utilizar o Docker, certifique-se de que o MongoDB está instalado localmente.

---

## Configuração e Execução

### 1. Clone o repositório

```bash
git clone https://github.com/luizclaudiolc/ozmap.git
cd ozmap
```

2. Instale as dependências

```bash
pnpm i
```

3. Suba o MongoDB via Docker

Caso prefira usar Docker para o banco de dados, inicie o MongoDB com:

```bash
docker start seu-container-docker
```

4. Inicie o Servidor

Para executar o servidor em modo de desenvolvimento, utilize:

```bash
pnpm run dev
```

O servidor ficará disponível em: http://localhost:3000
Endpoints da API
Usuários

    Criar Usuário
    POST /users
    Payload Exemplo:

    {
      "name": "João",
      "email": "joao@email.com",
      "coordinates": [-43.174, -22.511]
      "regions": []
    }

    Listar Usuários
    GET /users

    Detalhar Usuário
    GET /users/:id

    Atualizar Usuário
    PUT /users/:id

    Remover Usuário
    DELETE /users/:id

Regiões

As rotas para gerenciamento de regiões seguem a mesma estrutura do CRUD:

    Criar Região: POST /regions
    Listar Regiões: GET /regions
    Detalhar Região: GET /regions/:id
    Atualizar Região: PUT /regions/:id
    Remover Região: DELETE /regions/:id
	Buscar Ponto em Região: GET /regions/contains
	Busca Região por distância: GET /regions/near

5. Testes

Para executar os testes automatizados do projeto, utilize:

```bash
pnpm run test:watch
```

Os testes utilizam o Supertest para simular requisições HTTP e validar as respostas da API.

Internacionalização

O projeto utiliza i18next para fornecer mensagens multilíngues.

    As traduções estão definidas em arquivos de configuração no diretório src/default-messeges.ts .
