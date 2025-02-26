import * as express from 'express';
import { RegionModel, UserModel } from './models';
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

interface CustomRequest extends Request {
  session?: mongoose.ClientSession;
}

const server = express();
const router = express.Router();

const STATUS = {
  OK: 200,
  CREATED: 201,
  UPDATED: 201,
  NOT_FOUND: 400,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  DEFAULT_ERROR: 418,
};

server.use(express.json());

// Middleware para iniciar a sessão
router.use(async (req: CustomRequest, res, next) => {
  const session = await mongoose.startSession();
  req.session = session;
  next();
});

// Middleware para encerrar a sessão
router.use((req: CustomRequest, res, next) => {
  res.on('finish', () => {
    if (req.session) {
      req.session.endSession();
    }
  });
  next();
});

router.get('/users', async (req, res) => {
  try {
    const { page, limit } = req.query;

    const [users, total] = await Promise.all([
      UserModel.find().lean(),
      UserModel.countDocuments(),
    ]);

    return res.status(STATUS.OK).json({
      rows: users,
      page,
      limit,
      total,
    });
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching users' });
  }
});

router.post('/users', async (req: CustomRequest, res) => {
  const session = req.session;

  try {
    const { name, email, address, coordinates, regions } = req.body;
    if (!name || !email || (!address && !coordinates)) {
      throw new Error('Nome, e-mail e (endereço ou coordenadas) são obrigatórios');
    }

    const formattedCoordinates = coordinates
      ? { type: 'Point', coordinates }
      : undefined;

    const newUser = new UserModel({
      name,
      email,
      address,
      coordinates: formattedCoordinates,
      regions: [],
    });

    await newUser.save({ session });

    if (regions && regions.length > 0) {
      const existingRegions = await RegionModel.find({ _id: { $in: regions } }).session(session);
      if (existingRegions.length !== regions.length) {
        throw new Error('Uma ou mais regiões não foram encontradas');
      }

      newUser.regions = regions;
      await newUser.save({ session });
    }

    
    return res.status(STATUS.CREATED).json(newUser);
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Erro ao criar usuário', error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findOne({ _id: id }).lean();

    if (!user) {
      return res.status(STATUS.NOT_FOUND).json({ message: 'User not found' });
    }

    return res.status(STATUS.OK).json(user);
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching user' });
  }
});

router.put('/users/:id', async (req: CustomRequest, res) => {
  const session = req.session;

  try {
    const { id } = req.params;
    const { name, regions } = req.body;

    const user = await UserModel.findById(id).session(session);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (name) user.name = name;

    if (regions && regions.length > 0) {
      const existingRegions = await RegionModel.find({ _id: { $in: regions } }).session(session);
      if (existingRegions.length !== regions.length) {
        throw new Error('Uma ou mais regiões não foram encontradas');
      }
      user.regions = regions;
    }

    await user.save({ session });

    
    return res.status(STATUS.UPDATED).json({ message: 'Usuário atualizado com sucesso', user });
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
});

router.delete('/users/:id', async (req: CustomRequest, res) => {
  const session = req.session;

  try {
    const { id } = req.params;

    const user = await UserModel.findById(id).session(session);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    await RegionModel.updateMany(
      { _id: { $in: user.regions } },
      { $unset: { user: "" } },
      { session }
    );

    await UserModel.findByIdAndDelete(id, { session });

    
    return res.status(STATUS.OK).json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Erro ao deletar usuário', error: error.message });
  }
});

router.get('/regions', async (req, res) => {
  try {
    const { page, limit } = req.query;

    const [regions, total] = await Promise.all([
      RegionModel.find().lean(),
      RegionModel.countDocuments(),
    ]);

    return res.status(STATUS.OK).json({
      rows: regions,
      page,
      limit,
      total,
    });
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching regions' });
  }
});

router.post('/regions', async (req: CustomRequest, res) => {
  const session = req.session;

  try {
    const { name, user, boundary } = req.body;

    if (!name || !user || !boundary) {
      return res.status(400).json({ message: 'Name, user, and boundary are required' });
    }

    const existingUser = await UserModel.findById(user);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (boundary.type !== 'Polygon' || !Array.isArray(boundary.coordinates)) {
      return res.status(400).json({ message: 'Invalid GeoJSON Polygon' });
    }

    const newRegion = new RegionModel({ name, user, boundary });
    await newRegion.save({ session });

    if (!existingUser.regions.includes(newRegion._id)) {
      existingUser.regions.push(newRegion._id);
    }

    await existingUser.save({ session });

    
    return res.status(STATUS.CREATED).json(newRegion);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, user, boundary } = req.body;
    const region = await RegionModel.findById(id);

    if (!region) return res.status(404).json({ message: 'Região não encontrada' });

    if (user && user !== region.user.toString()) {
      await UserModel.findByIdAndUpdate(region.user, { $pull: { regions: region._id } });
      await UserModel.findByIdAndUpdate(user, { $push: { regions: region._id } });
      region.user = user;
    }

    if (name) region.name = name;
    if (boundary) region.boundary = boundary;

    await region.save();
    res.json(region);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// router.delete('/regions/:id', async (req: CustomRequest, res) => {
//   const session = req.session;

//   try {
//     const { id } = req.params;

//     const region = await RegionModel.findById(id).session(session);
//     if (!region) {
//       return res.status(404).json({ message: 'Region not found' });
//     }

//     const user = await UserModel.findById(region.user).session(session);
//     if (user) {
//       user.regions = user.regions.filter((regionId) => regionId.toString() !== region._id.toString());
//       await user.save({ session });
//     }

//     await RegionModel.findByIdAndDelete(id, { session });

    
//     return res.status(STATUS.OK).json({ message: 'Região deletada com sucesso' });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// });
router.delete('/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const region = await RegionModel.findByIdAndDelete(id);
    if (!region) return res.status(404).json({ message: 'Região não encontrada' });

    await UserModel.findByIdAndUpdate(region.user, { $pull: { regions: id } });
    res.json({ message: 'Região deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/regions/contains', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'Coordenadas são necessárias' });

    const point = { type: 'Point', coordinates: [parseFloat(lng as string), parseFloat(lat as string)] };
    const regions = await RegionModel.find({ boundary: { $geoIntersects: { $geometry: point } } }).populate('user', 'name');

    res.json(regions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Listar regiões próximas a um ponto
router.get('/regions/near', async (req, res) => {
  try {
    const { lat, lng, distance, excludeUser } = req.query;
    if (!lat || !lng || !distance) return res.status(400).json({ message: 'Coordenadas e distância são necessárias' });

    const point = { type: 'Point', coordinates: [parseFloat(lng as string), parseFloat(lat as string)] };
    const query: any = { boundary: { $near: { $geometry: point, $maxDistance: parseInt(distance as string) } } };

    if (excludeUser) query.user = { $ne: excludeUser };

    const regions = await RegionModel.find(query).populate('user', 'name');
    res.json(regions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

server.use(router);

export default server;