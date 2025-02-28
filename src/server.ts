import express from 'express';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { INearQuery, IRegion, IUser } from './interfaces/all.interfaces';
import { SERVER_MESSAGES, STATUS } from './helpers/default-messeges';
import { UserModel } from './models/user.model';
import { RegionModel } from './models/region.model';
import swaggerUi from 'swagger-ui-express';
import swaggerDocs from './swagger.json';
interface ICustomRequest extends Request {
  session?: mongoose.ClientSession;
}

const server = express();
const router = express.Router();
server.use(express.json());

server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

router.use(async (req: ICustomRequest, res, next) => {
  req.session = await mongoose.startSession();
  next();
});

router.use((req: ICustomRequest, res, next) => {
  res.on('finish', () => req.session?.endSession());
  next();
});

const handleError = (
  res: Response,
  error,
  status = STATUS.INTERNAL_SERVER_ERROR
) => {
  console.error(error);
  return res
    .status(status)
    .json({ message: SERVER_MESSAGES.SERVER_ERROR(), error: error.message });
};

// Rotas de Usuários
router.get('/users', async (req: ICustomRequest, res) => {
  try {
    const users = await UserModel.find().lean<IUser[]>();
    return res.status(STATUS.OK).json(users);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/users', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());
  try {
    const { name, email, address, coordinates, regions } = req.body;
    if (!name || !email || (!address && !coordinates)) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ message: SERVER_MESSAGES.INVALID_DATA() });
    }

    const newUser = new UserModel({
      name,
      email,
      address,
      coordinates: coordinates ? { type: 'Point', coordinates } : undefined,
      regions: [],
    });
    await newUser.save({ session });

    if (regions?.length) {
      const existingRegions = await RegionModel.find({
        _id: { $in: regions },
      }).session(req.session!);
      if (existingRegions.length !== regions.length) {
        return res
          .status(STATUS.BAD_REQUEST)
          .json({ message: SERVER_MESSAGES.INVALID_DATA() });
      }
      newUser.regions = regions;
      await newUser.save({ session });
    }

    return res.status(STATUS.CREATED).json(newUser);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/users/:id', async (req: ICustomRequest, res) => {
  try {
    const user = await UserModel.findById(req.params.id).lean<IUser>();

    if (!user) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: SERVER_MESSAGES.USER_NOT_FOUND() });
    }

    return res.status(STATUS.OK).json(user);
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/users/:id', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());
  try {
    const { id } = req.params;
    const { name, regions } = req.body;

    const user = await UserModel.findById(id).session(req.session);
    if (!user)
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: SERVER_MESSAGES.USER_NOT_FOUND() });

    if (name) user.name = name;

    if (regions?.length) {
      const existingRegions = await RegionModel.find({
        _id: { $in: regions },
      }).session(session);
      if (existingRegions.length !== regions.length) {
        return res
          .status(STATUS.BAD_REQUEST)
          .json({ message: SERVER_MESSAGES.INVALID_DATA() });
      }
      user.regions = regions;
    }

    await user.save({ session });
    return res
      .status(STATUS.UPDATED)
      .json({ message: SERVER_MESSAGES.USER_UPDATED(), user });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/users/:id', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id).session(session);
    if (!user)
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: SERVER_MESSAGES.USER_NOT_FOUND() });

    await RegionModel.updateMany(
      { _id: { $in: user.regions } },
      { $set: { user: null } },
      { session }
    );

    await UserModel.findByIdAndDelete(id, { session });
    return res
      .status(STATUS.OK)
      .json({ message: SERVER_MESSAGES.USER_DELETED() });
  } catch (error) {
    return handleError(res, error);
  }
});

// Rotas de Regiões
router.get('/regions', async (req: ICustomRequest, res) => {
  const session = await mongoose.startSession();

  try {
    const [regions, total] = await Promise.all([
      RegionModel.find().session(session).lean<IRegion[]>(),
      RegionModel.countDocuments().session(session),
    ]);

    return res.status(STATUS.OK).json({ rows: regions, total });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/regions', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());

  try {
    const { name, user, boundary } = req.body;

    if (!name || !user || !boundary) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ message: SERVER_MESSAGES.INVALID_DATA() });
    }

    const existingUser = await UserModel.findById(user).session(session);
    if (!existingUser) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: SERVER_MESSAGES.USER_NOT_FOUND() });
    }

    if (boundary.type !== 'Polygon' || !Array.isArray(boundary.coordinates)) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ message: SERVER_MESSAGES.INVALID_POLYGON() });
    }

    const newRegion = new RegionModel({ name, user, boundary });
    await newRegion.save({ session });

    if (!existingUser.regions.includes(newRegion._id)) {
      existingUser.regions.push(newRegion._id);
    }

    await existingUser.save({ session });

    return res.status(STATUS.CREATED).json(newRegion);
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/regions/:id', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());

  try {
    const { id } = req.params;
    const { name, user, boundary } = req.body;

    const region = await RegionModel.findById(id).session(session);

    if (!region) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: SERVER_MESSAGES.REGION_NOT_FOUND() });
    }

    if (user && user !== region.user.toString()) {
      await UserModel.findByIdAndUpdate(
        region.user,
        { $pull: { regions: region._id } },
        { session }
      );

      await UserModel.findByIdAndUpdate(
        user,
        { $push: { regions: region._id } },
        { session }
      );

      region.user = user;
    }

    if (name) region.name = name;

    if (boundary) {
      if (boundary.type !== 'Polygon' || !Array.isArray(boundary.coordinates)) {
        return res
          .status(STATUS.BAD_REQUEST)
          .json({ message: SERVER_MESSAGES.INVALID_POLYGON() });
      }
      region.boundary = boundary;
    }

    await region.save({ session });

    return res.status(STATUS.UPDATED).json(region);
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/regions/:id', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());

  try {
    const { id } = req.params;
    const region = await RegionModel.findById(id).session(session);

    if (!region) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: SERVER_MESSAGES.REGION_NOT_FOUND() });
    }

    await UserModel.findByIdAndUpdate(
      region.user,
      { $pull: { regions: region._id } },
      { session }
    );

    await RegionModel.findByIdAndDelete(id, { session });

    return res
      .status(STATUS.OK)
      .json({ message: SERVER_MESSAGES.REGION_DELETED() });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/regions/contains', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());

  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ message: SERVER_MESSAGES.INVALID_DATA() });
    }

    const point = { type: 'Point', coordinates: [lng, lat] };
    // Use session na consulta
    const region = await RegionModel.findOne({
      boundary: {
        $geoIntersects: { $geometry: point },
      },
    }).session(session);

    if (!region) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ message: SERVER_MESSAGES.REGION_NOT_FOUND() });
    }

    return res.status(STATUS.OK).json(region);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/regions/near', async (req: ICustomRequest, res) => {
  const session = req.session || (await mongoose.startSession());

  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const distance = parseInt(req.query.distance as string, 10);
    const excludeUser = req.query.excludeUser as string | undefined;

    if (isNaN(lat) || isNaN(lng) || isNaN(distance)) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ message: SERVER_MESSAGES.INVALID_DATA() });
    }

    const point = { type: 'Point', coordinates: [lng, lat] };
    const query: INearQuery = {
      boundary: {
        $near: {
          $geometry: point,
          $maxDistance: distance,
        },
      },
    };

    if (excludeUser) {
      query.user = { $ne: excludeUser };
    }

    const regions = await RegionModel.find(query).session(session).populate({
      path: 'user',
      select: 'name',
      options: { session },
    });

    return res.status(STATUS.OK).json(regions);
  } catch (error) {
    return handleError(res, error);
  }
});

server.use(router);

export default server;
