import * as mongoose from 'mongoose';
import * as supertest from 'supertest';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { faker } from '@faker-js/faker';
import { RegionModel, UserModel } from './models';
import server from './server';
import { env } from './database';



describe('API Tests', () => {
  let userId: string;

  before(async () => {
    await mongoose.connect(`${env.MONGO_URI}`);
  });

  after(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await RegionModel.deleteMany({});
  });

  // Testes para a rota GET /users
  describe('GET /users', () => {
    it('deve retornar uma lista de usuários', async () => {
      await UserModel.create([
        { name: faker.person.firstName(), email: faker.internet.email(), address: faker.location.streetAddress({ useFullAddress: true }) },
        { name: faker.person.firstName(), email: faker.internet.email(), address: faker.location.streetAddress({ useFullAddress: true }) },
      ]);

      const response = await supertest(server).get('/users');
      console.log(response.body.rows);
      

      expect(response.status).to.equal(200);
      expect(response.body.rows).to.be.an('array').with.length(2);
    });
  });

  // Testes para a rota POST /users
  // describe('POST /users', () => {
  //   it('deve criar um novo usuário', async () => {
  //     const newUser = {
  //       name: faker.person.firstName(),
  //       email: faker.internet.email(),
  //       address: faker.location.streetAddress({ useFullAddress: true }),
  //     };

  //     const response = await supertest(server).post('/users').send(newUser);

  //     expect(response.status).to.equal(201);
  //     expect(response.body).to.include({ name: newUser.name, email: newUser.email });
  //     userId = response.body._id;
  //   });

  //   it('deve retornar erro ao faltar campos obrigatórios', async () => {
  //     const response = await supertest(server).post('/users').send({});

  //     expect(response.status).to.equal(400);
  //     expect(response.body).to.have.property('message');
  //   });
  // });

  // Testes para a rota GET /users/:id
  // describe('GET /users/:id', () => {
  //   it('deve retornar um usuário específico', async () => {
  //     // Primeiro, cria um usuário para testar
  //     const user = await UserModel.create({
  //       name: faker.person.firstName(),
  //       email: faker.internet.email(),
  //     });

  //     const response = await supertest(server).get(`/users/${user._id}`);

  //     expect(response.status).to.equal(200);
  //     expect(response.body).to.include({ name: user.name, email: user.email });
  //   });

  //   it('deve retornar erro se o usuário não existir', async () => {
  //     const fakeId = new mongoose.Types.ObjectId();
  //     const response = await supertest(server).get(`/users/${fakeId}`);

  //     expect(response.status).to.equal(404);
  //     expect(response.body).to.have.property('message', 'User not found');
  //   });
  // });

  // Testes para a rota PUT /users/:id
  // describe('PUT /users/:id', () => {
  //   it('deve atualizar um usuário existente', async () => {
  //     const user = await UserModel.create({
  //       name: 'Nome Antigo',
  //       email: 'email@antigo.com',
  //     });

  //     const updatedData = { name: 'Nome Novo' };

  //     const response = await supertest(server).put(`/users/${user._id}`).send(updatedData);

  //     expect(response.status).to.equal(201);
  //     expect(response.body.user).to.include({ name: 'Nome Novo' });
  //   });

  //   it('deve retornar erro ao tentar atualizar usuário inexistente', async () => {
  //     const fakeId = new mongoose.Types.ObjectId();
  //     const response = await supertest(server).put(`/users/${fakeId}`).send({ name: 'Teste' });

  //     expect(response.status).to.equal(404);
  //     expect(response.body).to.have.property('message', 'User not found');
  //   });
  // });

  // Testes para a rota DELETE /users/:id
  // describe('DELETE /users/:id', () => {
  //   it('deve deletar um usuário existente', async () => {
  //     const user = await UserModel.create({
  //       name: faker.person.firstName(),
  //       email: faker.internet.email(),
  //     });

  //     const response = await supertest(server).delete(`/users/${user._id}`);

  //     expect(response.status).to.equal(200);
  //     expect(response.body).to.have.property('message', 'User deleted successfully');
  //   });

  //   it('deve retornar erro ao tentar deletar usuário inexistente', async () => {
  //     const fakeId = new mongoose.Types.ObjectId();
  //     const response = await supertest(server).delete(`/users/${fakeId}`);

  //     expect(response.status).to.equal(404);
  //     expect(response.body).to.have.property('message', 'User not found');
  //   });
  // });

  // Testes para as rotas de Regions
  // describe('Regions API Tests', () => {
  //   let user; // Usuário para associar à região

  //   beforeEach(async () => {
  //     user = await UserModel.create({
  //       name: faker.person.firstName(),
  //       email: faker.internet.email(),
  //     });
  //   });

  //   // Teste para criação de região
  //   it('deve criar uma nova região', async () => {
  //     const newRegion = {
  //       name: faker.lorem.word(),
  //       user: user._id,
  //     };

  //     const response = await supertest(server).post('/regions').send(newRegion);

  //     expect(response.status).to.equal(201);
  //     expect(response.body).to.include({ name: newRegion.name });
  //   });

  //   // Teste para listar regiões
  //   it('deve retornar uma lista de regiões', async () => {
  //     await RegionModel.create([{ name: 'Região 1', user: user._id }, { name: 'Região 2', user: user._id }]);

  //     const response = await supertest(server).get('/regions');

  //     expect(response.status).to.equal(200);
  //     expect(response.body.rows).to.be.an('array').with.length(2);
  //   });
  // });
});
