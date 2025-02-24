import * as express from 'express';
import { RegionModel, UserModel } from './models';

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

router.post('/users', async (req, res) => {
  try {
    const { name, email, address, coordinates, regions } = req.body;
    console.log({ name, email, address, coordinates, regions });
    

    if (!name || !email || (!address && !coordinates)) {
      return res.status(STATUS.BAD_REQUEST).json({ message: 'Nome, e-mail e (endereço ou coordenadas) são obrigatórios' });
    }

    const newUser = new UserModel({ name, email, address, coordinates, regions });

    await newUser.save();

    return res.status(STATUS.CREATED).json(newUser);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Erro ao criar usuário' });
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


router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(STATUS.BAD_REQUEST).json({ message: 'Invalid request body' });
    }

    const user = await UserModel.findOneAndUpdate({ _id: id }, { name }, { new: true });

    if (!user) {
      return res.status(STATUS.NOT_FOUND).json({ message: 'User not found' });
    }

    return res.status(STATUS.UPDATED).json({ message: 'User updated successfully', user });
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Error updating user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findByIdAndDelete(id);

    if (!user) {
      return res.status(STATUS.NOT_FOUND).json({ message: 'User not found' });
    }

    return res.status(STATUS.OK).json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Error deleting user' });
  }
});

server.use(router);

export default server;