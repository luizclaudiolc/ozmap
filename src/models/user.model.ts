import 'reflect-metadata';
import * as mongoose from 'mongoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { pre, getModelForClass, prop, Ref } from '@typegoose/typegoose';
import ObjectId = mongoose.Types.ObjectId;
import { MODELS_ERROR_MESSAGES } from '../helpers/default-messeges';
import { IGeoJSONPoint } from '../interfaces/all.interfaces';
import lib from '../lib';
// Interessante essa forma de importação, buscar melhor sobre referência circular
import type { Region } from './region.model';

class Base extends TimeStamps {
  @prop({ required: true, default: () => new ObjectId().toString() })
  _id!: string;
}

@pre<User>('validate', function(next) {
  if (this.isNew) {
    if ((this.address && this.coordinates) || (!this.address && !this.coordinates)) {
      return next(new Error(MODELS_ERROR_MESSAGES.ADDRESS_OR_COORDINATES()));
    }
  }
  next();
})

@pre<User>('save', async function(next) {
  try {
    const user = this as User & mongoose.Document;
    const session = user.$session();
    
    if (user.isModified('coordinates') && user.coordinates) {
      user.address = await lib.getAddressFromCoordinates(user.coordinates.coordinates);
    } else if (user.isModified('address') && user.address) {
      const { lat, lng } = await lib.getCoordinatesFromAddress(user.address);
      user.coordinates = { type: 'Point', coordinates: [lng, lat] };
    }
    
    next();
  } catch (error) {
    next(error);
  }
})

export class User extends Base {
  @prop({ required: true })
  name!: string;
  
  @prop({ required: true })
  email!: string;
  
  @prop({ required: false })
  address?: string;
  
  @prop({
    required: false,
    type: () => Object,
    validate: {
      validator: (v: IGeoJSONPoint) => v?.type === 'Point' && Array.isArray(v.coordinates) && v.coordinates.length === 2,
      message: MODELS_ERROR_MESSAGES.INVALID_GEOJSON_POINT(),
    },
  })
  coordinates?: IGeoJSONPoint;
  
  @prop({ required: true, default: [], ref: 'Region' })
  regions!: Ref<Region>[];
}

export const UserModel = getModelForClass(User);