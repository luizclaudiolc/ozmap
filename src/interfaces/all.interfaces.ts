import { Ref } from "@typegoose/typegoose";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  address?: string;
  coordinates?: IGeoJSONPoint;
  regions: Ref<IRegion>[];
}

export interface IRegion {
  _id: string;
  name: string;
  user?: Ref<IUser>;
  boundary: IGeoJSONPolygon;
}

export interface IGeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface IGeoJSONPolygon {
  type: 'Polygon';
  coordinates: [[number, number][]];
}
