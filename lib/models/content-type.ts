import "server-only"

import {
  model,
  models,
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose"

import { fieldTypes, type FieldType } from "@/lib/content-schema"

export type FieldDefinition = {
  id: string
  name: string
  apiId: string
  type: FieldType
  required: boolean
  multiple: boolean
  relatedContentTypeId?: Types.ObjectId
}

export type ContentTypeRecord = {
  tenantId: Types.ObjectId
  name: string
  apiId: string
  description: string
  fields: FieldDefinition[]
  createdAt: Date
  updatedAt: Date
}

export type ContentTypeDocument = HydratedDocument<ContentTypeRecord>

const fieldSchema = new Schema<FieldDefinition>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    apiId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 63,
      match: /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    },
    type: { type: String, enum: fieldTypes, required: true },
    required: { type: Boolean, required: true, default: false },
    multiple: { type: Boolean, required: true, default: false },
    relatedContentTypeId: { type: Schema.Types.ObjectId, ref: "ContentType" },
  },
  { _id: false }
)

const contentTypeSchema = new Schema<ContentTypeRecord>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    apiId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 63,
      match: /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    fields: { type: [fieldSchema], default: [] },
  },
  { timestamps: true }
)

contentTypeSchema.index(
  { tenantId: 1, apiId: 1 },
  { unique: true, name: "content_type_tenant_api_id_unique" }
)

export const ContentTypeModel =
  (models.ContentType as Model<ContentTypeRecord> | undefined) ??
  model<ContentTypeRecord>("ContentType", contentTypeSchema)
