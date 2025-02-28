import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { STATUS } from '../helpers/default-messeges';
import { RegionModel } from '../models/region.model';
import { UserModel } from '../models/user.model';
import server from '../server';
import {
  ADDRESS_PETROPOLIS,
  createUser,
  expectStatus,
  getCoordenatesPetropolis,
  setupTestEnvironment,
} from './testHelpers';

describe('Testes de Rotas de Usuários', () => {
  const testEnv = setupTestEnvironment();

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
      // Cria uma região para associar
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
