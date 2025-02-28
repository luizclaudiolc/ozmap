import 'reflect-metadata';
import * as mongoose from 'mongoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import {
  pre,
  getModelForClass,
  prop,
  Ref,
  modelOptions,
} from '@typegoose/typegoose';
import ObjectId = mongoose.Types.ObjectId;
import { IGeoJSONPolygon } from '../interfaces/all.interfaces';
import { MODELS_ERROR_MESSAGES } from '../helpers/default-messeges';
import type { User } from './user.model';
import { UserModel } from './user.model';

class Base extends TimeStamps {
  @prop({ required: true, default: () => new ObjectId().toString() })
  _id!: string;
}

@pre<Region>('save', async function (next) {
  try {
    const region = this as Region & mongoose.Document;
    region._id = region._id || new ObjectId().toString();

    if (region.isNew && region.user) {
      const session = region.$session();
      const user = await UserModel.findById(region.user).session(session);

      if (!user) {
        return next(new Error(MODELS_ERROR_MESSAGES.USER_NOT_FOUND()));
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
export class Region extends Base {
  @prop({ required: true })
  name!: string;

  @prop({
    required: true,
    type: () => Object,
    validate: {
      validator: (v: IGeoJSONPolygon) => v?.type === 'Polygon',
      message: MODELS_ERROR_MESSAGES.INVALID_GEOJSON_POLYGON(),
    },
  })
  boundary!: IGeoJSONPolygon;

  @prop({ ref: 'User', required: false })
  user?: Ref<User>;
}

export const RegionModel = getModelForClass(Region);
RegionModel.schema.index({ boundary: '2dsphere' });
