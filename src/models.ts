import 'reflect-metadata';
import * as mongoose from 'mongoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { pre, getModelForClass, Prop, Ref, modelOptions } from '@typegoose/typegoose';
import lib from './lib';

import { IGeoJSONPoint, IGeoJSONPolygon, IRegion, IUser } from './interfaces/all.interfaces';
import { MODELS_ERROR_MESSAGES } from './helpers/default-messeges';
import ObjectId = mongoose.Types.ObjectId;
class Base extends TimeStamps {
  @Prop({ required: true, default: () => new ObjectId().toString() })
  _id!: string;
}

@pre<User>('validate', function (next) {
  if (this.isNew) {
    if ((this.address && this.coordinates) || (!this.address && !this.coordinates)) {
      return next(new Error(MODELS_ERROR_MESSAGES.ADDRESS_OR_COORDINATES));
    }
  }
  next();
})
@pre<User>('save', async function (next) {
  try {
    const user = this as IUser & mongoose.Document;
    const session = user.$session();

    if (user.isModified('coordinates') && user.coordinates) {
      user.address = await lib.getAddressFromCoordinates(user.coordinates.coordinates);
    } else if (user.isModified('address') && user.address) {
      const { lat, lng } = await lib.getCoordinatesFromAddress(user.address);
      user.coordinates = { type: 'Point', coordinates: [lng, lat] };
    }

    await UserModel.updateOne({ _id: user._id }, user, session ? { session } : {});
    next();
  } catch (error) {
    next(error);
  }
})
export class User extends Base implements IUser {
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
      validator: (v: IGeoJSONPoint) => v?.type === 'Point' && Array.isArray(v.coordinates) && v.coordinates.length === 2,
      message: MODELS_ERROR_MESSAGES.INVALID_GEOJSON_POINT,
    },
  })
  coordinates?: IGeoJSONPoint;

  @Prop({ required: true, default: [], ref: () => Region, type: () => String })
  regions!: Ref<IRegion>[];
}

/** Region Model **/
@pre<Region>('save', async function (next) {
  try {
    const region = this as IRegion & mongoose.Document;
    region._id = region._id || new ObjectId().toString();

    if (region.isNew && region.user) {
      const session = region.$session();
      const user = await UserModel.findById(region.user).session(session);

      if (!user) {
        return next(new Error(MODELS_ERROR_MESSAGES.USER_NOT_FOUND));
      }

      if (!user.regions.includes(region._id)) {
        user.regions.push(region._id);
        await user.save(session ? { session } : {});
      }
    }
    next();
  } catch (error) {
    next(error);
  }
})
@modelOptions({ schemaOptions: { validateBeforeSave: false } })
export class Region extends Base implements IRegion {
  @Prop({ required: true, auto: true })
  _id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    type: () => Object,
    validate: {
      validator: (v: IGeoJSONPolygon) => v?.type === 'Polygon',
      message: MODELS_ERROR_MESSAGES.INVALID_GEOJSON_POLYGON,
    },
  })
  boundary!: IGeoJSONPolygon;

  @Prop({ ref: () => User, required: false, type: () => String })
  user?: Ref<IUser>;
}

export const UserModel = getModelForClass(User);
export const RegionModel = getModelForClass(Region);
RegionModel.schema.index({ boundary: '2dsphere' });

