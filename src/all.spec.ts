import mongoose from 'mongoose';
import { expect } from 'chai';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { faker } from '@faker-js/faker';
import server from './server';
import { RegionModel, UserModel } from './models';
import { STATUS } from './helpers/default-messeges';
import { IGeoJSONPoint, IUser } from './interfaces/all.interfaces';

const PETROPOLIS_COORDS = {
  lng_min: -43.15,
  lng_max: -43.0,
  lat_min: -22.597,
  lat_max: -22.395,
};

const DEFAULT_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-43.1, -22.5],
      [-43.0, -22.5],
      [-43.0, -22.4],
      [-43.1, -22.4],
      [-43.1, -22.5],
    ],
  ],
};

const ADDRESS_PETROPOLIS =
  'Estrada do Gentio, Benfica, Itaipava, Petrópolis, Região Geográfica Imediata de Petrópolis, Região Metropolitana do Rio de Janeiro, Região Geográfica Intermediária de Petrópolis, Rio de Janeiro, Região Sudeste, 25730-745, Brasil';

const getCoordenatesPetropolis = () => {
  return [
    faker.number.float({
      min: PETROPOLIS_COORDS.lng_min,
      max: PETROPOLIS_COORDS.lng_max,
      precision: 0.0001,
    }),
    faker.number.float({
      min: PETROPOLIS_COORDS.lat_min,
      max: PETROPOLIS_COORDS.lat_max,
      precision: 0.0001,
    }),
  ];
};

const createRegion = async (userId = null, customBoundary = null) => {
  const region = await RegionModel.create({
    name: faker.location.city(),
    user: userId,
    boundary: customBoundary || DEFAULT_POLYGON,
  });
  return region;
};

const createUser = async (withAddress = true, withCoordinates = false) => {
  const userData: Omit<IUser, '_id'> = {
    name: faker.person.firstName(),
    email: faker.internet.email(),
    regions: [],
  };

  if (withAddress) {
    userData.address = ADDRESS_PETROPOLIS;
  }

  if (withCoordinates) {
    userData.coordinates = {
      type: 'Point',
      coordinates: getCoordenatesPetropolis(),
    } as IGeoJSONPoint;
  }

  const user = await UserModel.create(userData);
  return user;
};

const setupTestEnvironment = () => {
  let mongoServer: MongoMemoryServer;
  let testIds: { userId?: string; regionId?: string } = {};

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await RegionModel.deleteMany({});
  });

  return {
    getMongoServer: () => mongoServer,
    testIds,
  };
};

const expectStatus = (response, status: number) => {
  expect(response.status).to.equal(status);
  return response;
};

describe('Testes endpoints', () => {
  const testEnv = setupTestEnvironment();

  describe('Testes de Rotas de Usuários', () => {
    describe('GET /users', () => {
      it('deve retornar uma lista vazia quando não há usuários', async () => {
        const response = await supertest(server).get('/users');

        expectStatus(response, STATUS.OK);
        expect(response.body).to.be.an('array').that.is.empty;
      });

      it('deve retornar uma lista de usuários', async () => {
        await createUser();
        await createUser();

        const response = await supertest(server).get('/users');

        expectStatus(response, STATUS.OK);
        expect(response.body).to.be.an('array').with.length(2);
        expect(response.body[0]).to.have.property('name');
        expect(response.body[0]).to.have.property('email');
        expect(response.body[0]).to.have.property('address');
      });
    });

    describe('POST /users', () => {
      it('deve criar um novo usuário com sucesso', async () => {
        const userData = {
          name: faker.person.firstName(),
          email: faker.internet.email(),
          coordinates: getCoordenatesPetropolis(),
          regions: [],
        };

        const response = await supertest(server).post('/users').send(userData);

        expectStatus(response, STATUS.CREATED);
        expect(response.body).to.have.property('_id');
        expect(response.body.name).to.equal(userData.name);
        expect(response.body.email).to.equal(userData.email);

        testEnv.testIds.userId = response.body._id;
      });

      it('deve criar um usuário com coordenadas', async () => {
        const userData = {
          name: faker.person.firstName(),
          email: faker.internet.email(),
          coordinates: getCoordenatesPetropolis(),
          regions: [],
        };

        const response = await supertest(server).post('/users').send(userData);

        expectStatus(response, STATUS.CREATED);
        expect(response.body.coordinates).to.have.property('type', 'Point');
        expect(response.body.coordinates.coordinates).to.deep.equal(
          userData.coordinates
        );
      });

      it('deve criar um usuário com endereço', async () => {
        const userData = {
          name: faker.person.firstName(),
          email: faker.internet.email(),
          address: ADDRESS_PETROPOLIS,
          regions: [],
        };

        const response = await supertest(server).post('/users').send(userData);

        expectStatus(response, STATUS.CREATED);
        expect(response.body).to.have.property('address', userData.address);
        expect(response.body).to.have.property('coordinates');
      });

      it('deve associar regiões a um usuário', async () => {
        const region = await RegionModel.create({
          name: faker.location.city(),
          area: faker.number.int({ min: 100, max: 1000 }),
        });

        testEnv.testIds.regionId = region._id.toString();

        const userData = {
          name: faker.person.firstName(),
          email: faker.internet.email(),
          coordinates: getCoordenatesPetropolis(),
          regions: [testEnv.testIds.regionId],
        };

        const response = await supertest(server).post('/users').send(userData);

        expectStatus(response, STATUS.CREATED);
        expect(response.body.regions).to.be.an('array').with.length(1);
        expect(response.body.regions[0].toString()).to.equal(
          testEnv.testIds.regionId
        );
      });

      it('deve retornar erro quando dados obrigatórios não são fornecidos', async () => {
        const response = await supertest(server)
          .post('/users')
          .send({ name: faker.person.firstName() });

        expectStatus(response, STATUS.BAD_REQUEST);
        expect(response.body).to.have.property('message');
      });
    });

    describe('GET /users/:id', () => {
      beforeEach(async () => {
        const user = await createUser();
        testEnv.testIds.userId = user._id.toString();
      });

      it('deve retornar um usuário específico pelo ID', async () => {
        const response = await supertest(server).get(
          `/users/${testEnv.testIds.userId}`
        );

        expectStatus(response, STATUS.OK);
        expect(response.body).to.have.property('_id', testEnv.testIds.userId);
        expect(response.body).to.have.property('name');
        expect(response.body).to.have.property('email');
      });

      it('deve retornar 404 para um ID inexistente', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await supertest(server).get(`/users/${fakeId}`);

        expectStatus(response, STATUS.NOT_FOUND);
        expect(response.body).to.have.property('message');
      });

      it('deve retornar erro para um ID inválido', async () => {
        const response = await supertest(server).get('/users/invalid-id');
        expect(response.status).to.not.equal(STATUS.OK);
      });
    });

    describe('PUT /users/:id', () => {
      beforeEach(async () => {
        const user = await createUser(false, true);
        testEnv.testIds.userId = user._id.toString();
      });

      it('deve atualizar o nome de um usuário', async () => {
        const newName = faker.person.firstName();

        const response = await supertest(server)
          .put(`/users/${testEnv.testIds.userId}`)
          .send({ name: newName });

        expectStatus(response, STATUS.UPDATED);

        const updatedUser = await UserModel.findById(testEnv.testIds.userId);
        expect(updatedUser).to.have.property('name', newName);
      });

      it('deve atualizar as regiões de um usuário', async () => {
        const region = await RegionModel.create({
          name: faker.location.city(),
          area: faker.number.int({ min: 100, max: 1000 }),
        });

        testEnv.testIds.regionId = region._id.toString();

        const response = await supertest(server)
          .put(`/users/${testEnv.testIds.userId}`)
          .send({ regions: [testEnv.testIds.regionId] });

        expectStatus(response, STATUS.UPDATED);

        const updatedUser = await UserModel.findById(testEnv.testIds.userId);
        expect(updatedUser.regions).to.be.an('array').with.length(1);
        expect(updatedUser.regions[0].toString()).to.equal(
          testEnv.testIds.regionId
        );
      });

      it('deve retornar 404 para um ID inexistente', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await supertest(server)
          .put(`/users/${fakeId}`)
          .send({ name: faker.person.firstName() });

        expectStatus(response, STATUS.NOT_FOUND);
        expect(response.body).to.have.property('message');
      });

      it('deve retornar erro quando uma região inexistente é fornecida', async () => {
        const fakeRegionId = new mongoose.Types.ObjectId().toString();

        const response = await supertest(server)
          .put(`/users/${testEnv.testIds.userId}`)
          .send({ regions: [fakeRegionId] });

        expectStatus(response, STATUS.BAD_REQUEST);
        expect(response.body).to.have.property('message');
      });
    });

    describe('DELETE /users/:id', () => {
      beforeEach(async () => {
        const user = await createUser();
        testEnv.testIds.userId = user._id.toString();
      });

      it('deve deletar um usuário com sucesso', async () => {
        const response = await supertest(server).delete(
          `/users/${testEnv.testIds.userId}`
        );

        expectStatus(response, STATUS.OK);
        expect(response.body).to.have.property('message');

        const userCheck = await UserModel.findById(testEnv.testIds.userId);
        expect(userCheck).to.be.null;
      });

      it('deve remover a referência de usuário nas regiões associadas', async () => {
        const region = await RegionModel.create({
          name: faker.location.city(),
          area: faker.number.int({ min: 100, max: 1000 }),
          user: testEnv.testIds.userId,
        });

        await UserModel.findByIdAndUpdate(testEnv.testIds.userId, {
          $push: { regions: region._id },
        });

        await supertest(server).delete(`/users/${testEnv.testIds.userId}`);

        const updatedRegion = await RegionModel.findById(region._id);
        expect(updatedRegion.user).to.be.null;
      });

      it('deve retornar 404 para um ID inexistente', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await supertest(server).delete(`/users/${fakeId}`);

        expectStatus(response, STATUS.NOT_FOUND);
        expect(response.body).to.have.property('message');
      });
    });
  });

  describe('Testes de Rotas de Regiões', () => {
    beforeEach(async () => {
      const user = await createUser();
      testEnv.testIds.userId = user._id.toString();
    });

    describe('GET /regions', () => {
      it('deve retornar uma lista vazia quando não há regiões', async () => {
        const response = await supertest(server).get('/regions');

        expectStatus(response, STATUS.OK);
        expect(response.body).to.have.property('rows');
        expect(response.body.rows).to.be.an('array').that.is.empty;
        expect(response.body).to.have.property('total', 0);
      });

      it('deve retornar uma lista de regiões', async () => {
        await createRegion(testEnv.testIds.userId);
        await createRegion(testEnv.testIds.userId);

        const response = await supertest(server).get('/regions');

        expectStatus(response, STATUS.OK);
        expect(response.body).to.have.property('rows');
        expect(response.body.rows).to.be.an('array').with.length(2);
        expect(response.body).to.have.property('total', 2);
        expect(response.body.rows[0]).to.have.property('name');
        expect(response.body.rows[0]).to.have.property('boundary');
      });
    });

    describe('POST /regions', () => {
      it('deve criar uma nova região com sucesso', async () => {
        const regionData = {
          name: faker.location.city(),
          user: testEnv.testIds.userId,
          boundary: DEFAULT_POLYGON,
        };

        const response = await supertest(server)
          .post('/regions')
          .send(regionData);

        expectStatus(response, STATUS.CREATED);
        expect(response.body).to.have.property('_id');
        expect(response.body.name).to.equal(regionData.name);
        expect(response.body.user.toString()).to.equal(testEnv.testIds.userId);

        testEnv.testIds.regionId = response.body._id;

        const updatedUser = await UserModel.findById(testEnv.testIds.userId);
        expect(updatedUser.regions).to.include(
          new mongoose.Types.ObjectId(testEnv.testIds.regionId)
        );
      });

      it('deve retornar erro quando dados obrigatórios não são fornecidos', async () => {
        const response = await supertest(server).post('/regions').send({
          user: testEnv.testIds.userId,
          boundary: DEFAULT_POLYGON,
        });

        expectStatus(response, STATUS.BAD_REQUEST);
        expect(response.body).to.have.property('message');
      });

      it('deve retornar erro quando usuário não existe', async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();
        const regionData = {
          name: faker.location.city(),
          user: fakeUserId,
          boundary: DEFAULT_POLYGON,
        };

        const response = await supertest(server)
          .post('/regions')
          .send(regionData);

        expectStatus(response, STATUS.NOT_FOUND);
        expect(response.body).to.have.property('message');
      });

      it('deve retornar erro quando o boundary não é um polígono válido', async () => {
        const regionData = {
          name: faker.location.city(),
          user: testEnv.testIds.userId,
          boundary: {
            type: 'Point',
            coordinates: [-43.1, -22.5],
          },
        };

        const response = await supertest(server)
          .post('/regions')
          .send(regionData);

        expectStatus(response, STATUS.BAD_REQUEST);
        expect(response.body).to.have.property('message');
      });
    });

    describe('PUT /regions/:id', () => {
      beforeEach(async () => {
        const region = await createRegion(testEnv.testIds.userId);
        testEnv.testIds.regionId = region._id.toString();
      });

      it('deve atualizar o nome de uma região', async () => {
        const newName = faker.location.city();

        const response = await supertest(server)
          .put(`/regions/${testEnv.testIds.regionId}`)
          .send({ name: newName });

        expectStatus(response, STATUS.UPDATED);

        const updatedRegion = await RegionModel.findById(
          testEnv.testIds.regionId
        );
        expect(updatedRegion).to.have.property('name', newName);
      });

      it('deve atualizar o usuário associado a uma região', async () => {
        const newUser = await createUser();
        const newUserId = newUser._id.toString();

        const response = await supertest(server)
          .put(`/regions/${testEnv.testIds.regionId}`)
          .send({ user: newUserId });

        expectStatus(response, STATUS.UPDATED);

        const updatedRegion = await RegionModel.findById(
          testEnv.testIds.regionId
        );
        expect(updatedRegion.user.toString()).to.equal(newUserId);
      });

      it('deve atualizar o boundary de uma região', async () => {
        const newBoundary = {
          type: 'Polygon',
          coordinates: [
            [
              [-43.2, -22.6],
              [-43.1, -22.6],
              [-43.1, -22.5],
              [-43.2, -22.5],
              [-43.2, -22.6],
            ],
          ],
        };

        const response = await supertest(server)
          .put(`/regions/${testEnv.testIds.regionId}`)
          .send({ boundary: newBoundary });

        expectStatus(response, STATUS.UPDATED);

        const updatedRegion = await RegionModel.findById(
          testEnv.testIds.regionId
        );
        expect(updatedRegion).to.have.property('boundary');
      });

      it('deve retornar erro quando a região não existe', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await supertest(server)
          .put(`/regions/${fakeId}`)
          .send({ name: faker.location.city() });

        expectStatus(response, STATUS.NOT_FOUND);
        expect(response.body).to.have.property('message');
      });

      it('deve retornar erro quando o boundary não é válido', async () => {
        const invalidBoundary = {
          type: 'LineString',
          coordinates: [
            [-43.1, -22.5],
            [-43.0, -22.4],
          ],
        };

        const response = await supertest(server)
          .put(`/regions/${testEnv.testIds.regionId}`)
          .send({ boundary: invalidBoundary });

        expectStatus(response, STATUS.BAD_REQUEST);
        expect(response.body).to.have.property('message');
      });
    });

    describe('DELETE /regions/:id', () => {
      beforeEach(async () => {
        const region = await createRegion(testEnv.testIds.userId);
        testEnv.testIds.regionId = region._id.toString();

        await UserModel.findByIdAndUpdate(testEnv.testIds.userId, {
          $push: { regions: region._id },
        });
      });

      it('deve deletar uma região com sucesso', async () => {
        const response = await supertest(server).delete(
          `/regions/${testEnv.testIds.regionId}`
        );

        expectStatus(response, STATUS.OK);
        expect(response.body).to.have.property('message');

        const regionCheck = await RegionModel.findById(
          testEnv.testIds.regionId
        );
        expect(regionCheck).to.be.null;

        const userCheck = await UserModel.findById(testEnv.testIds.userId);
        expect(userCheck.regions).to.not.include(
          new mongoose.Types.ObjectId(testEnv.testIds.regionId)
        );
      });

      it('deve retornar erro quando a região não existe', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await supertest(server).delete(`/regions/${fakeId}`);

        expectStatus(response, STATUS.NOT_FOUND);
        expect(response.body).to.have.property('message');
      });
    });

    describe('GET /regions/contains', () => {
      beforeEach(async () => {
        const region = await RegionModel.create({
          name: faker.location.city(),
          user: testEnv.testIds.userId,
          boundary: DEFAULT_POLYGON,
        });
        testEnv.testIds.regionId = region._id.toString();
      });

      it('deve encontrar a região que contém o ponto especificado', async () => {
        const response = await supertest(server)
          .get('/regions/contains')
          .query({ lat: -22.45, lng: -43.05 });

        expectStatus(response, STATUS.OK);
        expect(response.body).to.have.property('_id', testEnv.testIds.regionId);
        expect(response.body).to.have.property('name');
      });

      it('deve retornar 404 quando nenhuma região contém o ponto', async () => {
        const response = await supertest(server)
          .get('/regions/contains')
          .query({ lat: -23.0, lng: -44.0 });

        expectStatus(response, STATUS.NOT_FOUND);
        expect(response.body).to.have.property('message');
      });

      it('deve retornar erro quando as coordenadas são inválidas', async () => {
        const response = await supertest(server)
          .get('/regions/contains')
          .query({ lat: 'Deu', lng: 'ruim' });

        expectStatus(response, STATUS.BAD_REQUEST);
        expect(response.body).to.have.property('message');
      });
    });

    describe('GET /regions/near', () => {
      beforeEach(async () => {
        await RegionModel.create({
          name: 'Região Central',
          user: testEnv.testIds.userId,
          boundary: DEFAULT_POLYGON,
        });

        const secondUser = await createUser();
        await RegionModel.create({
          name: 'Região Sul',
          user: secondUser._id,
          boundary: {
            type: 'Polygon',
            coordinates: [
              [
                [-43.15, -22.55],
                [-43.05, -22.55],
                [-43.05, -22.45],
                [-43.15, -22.45],
                [-43.15, -22.55],
              ],
            ],
          },
        });

        await RegionModel.create({
          name: 'Região Norte',
          user: testEnv.testIds.userId,
          boundary: {
            type: 'Polygon',
            coordinates: [
              [
                [-43.05, -22.35],
                [-42.95, -22.35],
                [-42.95, -22.25],
                [-43.05, -22.25],
                [-43.05, -22.35],
              ],
            ],
          },
        });
      });

      it('deve encontrar regiões próximas ao ponto especificado', async () => {
        const response = await supertest(server)
          .get('/regions/near')
          .query({ lat: -22.5, lng: -43.1, distance: 50000 }); 

        expectStatus(response, STATUS.OK);
        expect(response.body).to.be.an('array');
        expect(response.body.length).to.be.greaterThan(0);
      });

      it('deve excluir regiões de um usuário específico', async () => {
        const response = await supertest(server).get('/regions/near').query({
          lat: -22.5,
          lng: -43.1,
          distance: 10000,
          excludeUser: testEnv.testIds.userId,
        });

        expectStatus(response, STATUS.OK);
        expect(response.body).to.be.an('array');

        response.body.forEach((region) => {
          expect(region.user.toString()).to.not.equal(testEnv.testIds.userId);
        });
      });

      it('deve retornar erro quando as coordenadas são inválidas', async () => {
        const response = await supertest(server)
          .get('/regions/near')
          .query({ lat: 'deu', lng: 'ruim', distance: 10000 });

        expectStatus(response, STATUS.BAD_REQUEST);
        expect(response.body).to.have.property('message');
      });
    });
  });
});
