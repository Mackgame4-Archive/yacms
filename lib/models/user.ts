import "server-only"

import {
  model,
  models,
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose"

export type UserRecord = {
  name: string
  email: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = HydratedDocument<UserRecord>

const userSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
)

export const UserModel =
  (models.User as Model<UserRecord> | undefined) ??
  model<UserRecord>("User", userSchema)
