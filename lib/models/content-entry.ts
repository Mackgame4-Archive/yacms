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
  importKey?: string
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
    importKey: {
      type: String,
      trim: true,
      maxlength: 120,
      select: false,
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
contentEntrySchema.index(
  { tenantId: 1, contentTypeId: 1, importKey: 1 },
  {
    unique: true,
    name: "content_entry_import_key_unique",
    partialFilterExpression: { importKey: { $type: "string" } },
  }
)

export const ContentEntryModel =
  (models.ContentEntry as Model<ContentEntryRecord> | undefined) ??
  model<ContentEntryRecord>("ContentEntry", contentEntrySchema)

// Keep the cached development model in sync after adding import support.
if (!ContentEntryModel.schema.path("importKey")) {
  ContentEntryModel.schema.add({
    importKey: {
      type: String,
      trim: true,
      maxlength: 120,
      select: false,
    },
  })
  ContentEntryModel.schema.index(
    { tenantId: 1, contentTypeId: 1, importKey: 1 },
    {
      unique: true,
      name: "content_entry_import_key_unique",
      partialFilterExpression: { importKey: { $type: "string" } },
    }
  )
}
