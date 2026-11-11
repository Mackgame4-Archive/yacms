import "server-only"
import { model, models, Schema, type Model, type Types } from "mongoose"

export type StorageConnectionRecord = {
  tenantId: Types.ObjectId
  name: string
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  encryptedSecret: string
  createdAt: Date
}

const schema = new Schema<StorageConnectionRecord>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  bucket: { type: String, required: true, trim: true },
  region: { type: String, required: true, trim: true },
  endpoint: { type: String },
  accessKeyId: { type: String, required: true },
  encryptedSecret: { type: String, required: true },
}, { timestamps: true })

export const StorageConnectionModel =
  (models.StorageConnection as Model<StorageConnectionRecord> | undefined) ??
  model<StorageConnectionRecord>("StorageConnection", schema)
