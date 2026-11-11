import "server-only"

import {
  model,
  models,
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose"

export type SessionRecord = {
  tokenHash: string
  userId: Types.ObjectId
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export type SessionDocument = HydratedDocument<SessionRecord>

const sessionSchema = new Schema<SessionRecord>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
)

export const SessionModel =
  (models.Session as Model<SessionRecord> | undefined) ??
  model<SessionRecord>("Session", sessionSchema)
