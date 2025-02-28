import { faker } from '@faker-js/faker';
import { expect } from 'chai';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { STATUS } from '../helpers/default-messeges';
import { RegionModel } from '../models/region.model';
import { UserModel } from '../models/user.model';
import server from '../server';
import {
  createRegion,
  createUser,
  DEFAULT_POLYGON,
  expectStatus,
  setupTestEnvironment,
} from './testHelpers';

describe('Testes de Rotas de Regiões', () => {
  const testEnv = setupTestEnvironment();

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

      const regionCheck = await RegionModel.findById(testEnv.testIds.regionId);
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
