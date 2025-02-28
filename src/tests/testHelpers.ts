import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';
import { RegionModel } from '../models/region.model';
import { faker } from '@faker-js/faker';
import { IGeoJSONPoint, IUser } from '../interfaces/all.interfaces';
import supertest from 'supertest';
import { expect } from 'chai';

export const setupTestEnvironment = () => {
  let mongoServer: MongoMemoryServer;
  const testIds: { userId?: string; regionId?: string } = {};

  before(async function () {
    this.timeout(20000);
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async function () {
    this.timeout(5000);
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
export const createRegion = async (
  userId: string | null = null,
  customBoundary: any = null
) => {
  const region = await RegionModel.create({
    name: faker.location.city(),
    user: userId,
    boundary: customBoundary || DEFAULT_POLYGON,
  });
  return region;
};

export const createUser = async (
  withAddress = true,
  withCoordinates = false
) => {
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

export const expectStatus = (response: supertest.Response, status: number) => {
  expect(response.status).to.equal(status);
  return response;
};

export const DEFAULT_POLYGON = {
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

export const PETROPOLIS_COORDS = {
  lng_min: -43.15,
  lng_max: -43.0,
  lat_min: -22.597,
  lat_max: -22.395,
};

export const ADDRESS_PETROPOLIS = `Estrada do Gentio, Benfica, Itaipava, Petrópolis, Região Geográfica Imediata de Petrópolis, Região Metropolitana do Rio de Janeiro, Região Geográfica Intermediária de Petrópolis, Rio de Janeiro, Região Sudeste, 25730-745, Brasil`;

export const getCoordenatesPetropolis = () => {
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
