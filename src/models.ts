import 'reflect-metadata';

import * as mongoose from 'mongoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { pre, getModelForClass, Prop, Ref, modelOptions } from '@typegoose/typegoose';
import lib from './lib';

import ObjectId = mongoose.Types.ObjectId;

class Base extends TimeStamps {
  @Prop({ required: true, default: () => (new ObjectId()).toString() })
  _id: string;
}

@pre<User>('validate', function (next) {
  if (this.isNew) {
    if ((this.address && this.coordinates) || (!this.address && !this.coordinates)) {
      return next(new Error('You must provide either an address or coordinates, but not both.'));
    }
  }
  next();
})

@pre<User>('save', async function (next) {
  const user = this as Omit<any, keyof User> & User;

  const session = user.$session(); // Obtém a sessão ativa, se houver

  if (user.isModified('coordinates') && user.coordinates) {
    user.address = await lib.getAddressFromCoordinates(user.coordinates.coordinates);
  } else if (user.isModified('address') && user.address) {
    const { lat, lng } = await lib.getCoordinatesFromAddress(user.address);
    user.coordinates = {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }

  try {
    if (session) {
      await UserModel.updateOne({ _id: user._id }, user, { session });
    } else {
      await UserModel.updateOne({ _id: user._id }, user);
    }
  } catch (error) {
    return next(error);
  }

  next();
})



export class User extends Base {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: false })
  address?: string;

  @Prop({
    required: false,
    type: () => Object,
    validate: {
      validator: (v) => v && v.type === 'Point' && Array.isArray(v.coordinates) && v.coordinates.length === 2,
      message: (props) => `${props.value} is not a valid GeoJSON Point`,
    },
  })
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({ required: true, default: [], ref: () => Region, type: () => String })
  regions: Ref<Region>[];
}


@pre<Region>('save', async function (next) {
  const region = this as Omit<any, keyof Region> & Region;

  if (!region._id) {
    region._id = new ObjectId().toString();
  }

  if (region.isNew && region.user) {
    const session = region.$session();
    const user = await UserModel.findById(region.user).session(session);

    if (!user) {
      return next(new Error('Usuário não encontrado para vinculação da região.'));
    }

    if (!user.regions.includes(region._id)) {
      user.regions.push(region._id);

      if (session) {
        await user.save({ session });
      } else {
        await user.save();
      }
    }
  }

  next();
})


@modelOptions({ schemaOptions: { validateBeforeSave: false } })
export class Region extends Base {
  @Prop({ required: true, auto: true })
  _id: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, type: () => Object, validate: { validator: (v) => v.type === 'Polygon', message: 'Invalid GeoJSON Polygon' } })
  boundary!: {
    type: 'Polygon';
    coordinates: [[number, number][]];
  };

  @Prop({ ref: () => User, required: false, type: () => String })
  user: Ref<User>;
}

export const UserModel = getModelForClass(User);
export const RegionModel = getModelForClass(Region);
RegionModel.schema.index({ boundary: '2dsphere' });
