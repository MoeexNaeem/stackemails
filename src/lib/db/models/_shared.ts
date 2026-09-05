import type { Types } from "mongoose";

/** Fields Mongoose adds that InferSchemaType doesn't surface. */
export type BaseFields = {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};
