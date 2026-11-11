import "server-only"
import { model, models, Schema, type Model, type Types } from "mongoose"

export type MediaAssetRecord = {
  tenantId: Types.ObjectId
  connectionId: Types.ObjectId
  key: string
  filename: string
  contentType: string
  size: number
  createdAt: Date
}

const schema = new Schema<MediaAssetRecord>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  connectionId: { type: Schema.Types.ObjectId, required: true },
  key: { type: String, required: true },
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
}, { timestamps: true })

schema.index({ tenantId: 1, connectionId: 1 })

export const MediaAssetModel =
  (models.MediaAsset as Model<MediaAssetRecord> | undefined) ??
  model<MediaAssetRecord>("MediaAsset", schema)
