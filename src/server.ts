import * as express from 'express';
import { RegionModel, UserModel } from './models';
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { IRegion, IUser } from './interfaces/all.interfaces';
import { SERVER_MESSAGES, STATUS } from './helpers/default-messeges';
interface ICustomRequest extends Request {
  session?: mongoose.ClientSession;
}

const server = express();
const router = express.Router();
server.use(express.json());


// Middleware para iniciar a sessão
router.use(async (req: ICustomRequest, res, next) => {
  req.session = await mongoose.startSession();
  next();
});

// Middleware para encerrar a sessão
router.use((req: ICustomRequest, res, next) => {
  res.on('finish', () => req.session?.endSession());
  next();
});


// Função auxiliar para tratar erros
const handleError = (res: Response, error: any, status = STATUS.INTERNAL_SERVER_ERROR) => {
  console.error(error);
  return res.status(status).json({ message: SERVER_MESSAGES.SERVER_ERROR, error: error.message });
};


// Rotas de Usuários
router.get('/users', async (req, res) => {
  try {
    const users = await UserModel.find().lean<IUser[]>();
    return res.status(STATUS.OK).json(users);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/users', async (req: ICustomRequest, res) => {
  try {
    const { name, email, address, coordinates, regions } = req.body;
    if (!name || !email || (!address && !coordinates)) {
      return res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_DATA });
    }
    
    const newUser = new UserModel({
      name,
      email,
      address,
      coordinates: coordinates ? { type: 'Point', coordinates } : undefined,
      regions: [],
    });
    await newUser.save({ session: req.session });
    
    if (regions?.length) {
      const existingRegions = await RegionModel.find({ _id: { $in: regions } }).session(req.session!);
      if (existingRegions.length !== regions.length) {
        return res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_DATA });
      }
      newUser.regions = regions;
      await newUser.save({ session: req.session });
    }
    
    return res.status(STATUS.CREATED).json(newUser);
  } catch (error) {
    return handleError(res, error);
  }
});


router.get('/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id).lean<IUser>();
    if (!user) return res.status(STATUS.NOT_FOUND).json({ message: SERVER_MESSAGES.USER_NOT_FOUND });
    return res.status(STATUS.OK).json(user);
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/users/:id', async (req: ICustomRequest, res) => {
  try {
    const { id } = req.params;
    const { name, regions } = req.body;
    
    const user = await UserModel.findById(id).session(req.session);
    if (!user) return res.status(STATUS.NOT_FOUND).json({ message: SERVER_MESSAGES.USER_NOT_FOUND });
    
    if (name) user.name = name;
    
    if (regions?.length) {
      const existingRegions = await RegionModel.find({ _id: { $in: regions } }).session(req.session!);
      if (existingRegions.length !== regions.length) {
        return res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_DATA });
      }
      user.regions = regions;
    }
    
    await user.save({ session: req.session });
    return res.status(STATUS.UPDATED).json({ message: SERVER_MESSAGES.USER_UPDATED, user });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/users/:id', async (req: ICustomRequest, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id).session(req.session);
    if (!user) return res.status(STATUS.NOT_FOUND).json({ message: SERVER_MESSAGES.USER_NOT_FOUND });
    
    await RegionModel.updateMany(
      { _id: { $in: user.regions } },
      { $unset: { user: "" } },
      { session: req.session }
    );
    
    await UserModel.findByIdAndDelete(id, { session: req.session });
    return res.status(STATUS.OK).json({ message: SERVER_MESSAGES.USER_DELETED });
  } catch (error) {
    return handleError(res, error);
  }
});

// Rotas de Regiões
router.get('/regions', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const [regions, total] = await Promise.all([
      RegionModel.find().lean<IRegion[]>(),
      RegionModel.countDocuments(),
    ]);
    return res.status(STATUS.OK).json({ rows: regions, page, limit, total });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/regions', async (req: ICustomRequest, res) => {
  const session = req.session;

  try {
    const { name, user, boundary } = req.body;

    if (!name || !user || !boundary) {
      return res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_DATA });
    }

    const existingUser = await UserModel.findById(user).session(session);
    if (!existingUser) {
      return res.status(STATUS.NOT_FOUND).json({ message: SERVER_MESSAGES.USER_NOT_FOUND });
    }

    if (boundary.type !== 'Polygon' || !Array.isArray(boundary.coordinates)) {
      return res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_POLYGON });
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

router.put('/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, user, boundary } = req.body;
    const region = await RegionModel.findById(id);

    if (!region) return res.status(STATUS.NOT_FOUND).json({ message: SERVER_MESSAGES.REGION_NOT_FOUND });

    if (user && user !== region.user.toString()) {
      await UserModel.findByIdAndUpdate(region.user, { $pull: { regions: region._id } });
      await UserModel.findByIdAndUpdate(user, { $push: { regions: region._id } });
      region.user = user;
    }

    if (name) region.name = name;
    if (boundary) region.boundary = boundary;
    if (boundary.type !== 'Polygon' || !Array.isArray(boundary.coordinates)) 
      res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_POLYGON });

    await region.save();
    return res.status(STATUS.OK).json(region);
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const region = await RegionModel.findById(id);

    if (!region) return res.status(STATUS.NOT_FOUND).json({ message: SERVER_MESSAGES.REGION_NOT_FOUND });

    await UserModel.findByIdAndUpdate(region.user, { $pull: { regions: region._id } });
    await RegionModel.findByIdAndDelete(id);
    return res.status(STATUS.OK).json({ message: SERVER_MESSAGES.REGION_DELETED });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/regions/contains', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_DATA });
    }

    const point = { type: 'Point', coordinates: [lng, lat] };
    const region = await RegionModel.findOne({ boundary: { $geoIntersects: { $geometry: point } } });

    if (!region) {
      return res.status(STATUS.NOT_FOUND).json({ message: SERVER_MESSAGES.REGION_NOT_FOUND });
    }

    return res.status(STATUS.OK).json(region);
  }
  catch (error) {
    return handleError(res, error);
  }

  // const { lat, lng } = req.query;
  //   if (!lat || !lng) return res.status(400).json({ message: 'Coordenadas são necessárias' });

  //   const point = { type: 'Point', coordinates: [parseFloat(lng as string), parseFloat(lat as string)] };
  //   const regions = await RegionModel.find({ boundary: { $geoIntersects: { $geometry: point } } }).populate('user', 'name');

  //   res.json(regions);
  // } catch (error) {
  //   res.status(500).json({ message: error.message });
  // }
});

router.get('/regions/near', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const distance = parseInt(req.query.distance as string, 10);
    const excludeUser = req.query.excludeUser as string | undefined;

    if (isNaN(lat) || isNaN(lng) || isNaN(distance)) {
      return res.status(STATUS.BAD_REQUEST).json({ message: SERVER_MESSAGES.INVALID_DATA });
    }

    const point = { type: 'Point', coordinates: [lng, lat] };
    const query: any = {
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

    const regions = await RegionModel.find(query).populate('user', 'name');
    return res.status(STATUS.OK).json(regions);
  } catch (error) {
    return handleError(res, error);
  }
});


server.use(router);

export default server;