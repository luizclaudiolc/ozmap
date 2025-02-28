import mongoose from 'mongoose';

export const env = {
  MONGO_URI: 'mongodb://root:123456@127.0.0.1:27021/oz-map?authSource=admin',
};

const init = async function () {
  await mongoose
    .connect(env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch((err) => console.error('MongoDB connection error:', err));
};

export default init();
