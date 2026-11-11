import "server-only"

import {
  model,
  models,
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose"

export type ContentEntryRecord = {
  tenantId: Types.ObjectId
  contentTypeId: Types.ObjectId
  values: Map<string, unknown>
  status: "draft" | "published"
  createdAt: Date
  updatedAt: Date
}

export type ContentEntryDocument = HydratedDocument<ContentEntryRecord>

const contentEntrySchema = new Schema<ContentEntryRecord>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    contentTypeId: {
      type: Schema.Types.ObjectId,
      ref: "ContentType",
      required: true,
      index: true,
    },
    values: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      required: true,
      default: "draft",
    },
  },
  { timestamps: true }
)

contentEntrySchema.index({ tenantId: 1, contentTypeId: 1, updatedAt: -1 })

export const ContentEntryModel =
  (models.ContentEntry as Model<ContentEntryRecord> | undefined) ??
  model<ContentEntryRecord>("ContentEntry", contentEntrySchema)
