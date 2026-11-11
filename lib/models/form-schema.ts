import "server-only"

import {
  model,
  models,
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose"

import {
  formFieldTypes,
  type FormFieldType,
} from "@/lib/form-schema"

export type FormFieldDefinition = {
  id: string
  name: string
  apiId: string
  type: FormFieldType
  required: boolean
}

export type FormSchemaRecord = {
  tenantId: Types.ObjectId
  name: string
  apiId: string
  description: string
  fields: FormFieldDefinition[]
  createdAt: Date
  updatedAt: Date
}

export type FormSchemaDocument = HydratedDocument<FormSchemaRecord>

const formFieldSchema = new Schema<FormFieldDefinition>(
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
    type: { type: String, enum: formFieldTypes, required: true },
    required: { type: Boolean, required: true, default: false },
  },
  { _id: false }
)

const formSchema = new Schema<FormSchemaRecord>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
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
    fields: { type: [formFieldSchema], default: [] },
  },
  { timestamps: true }
)

formSchema.index(
  { tenantId: 1, apiId: 1 },
  { unique: true, name: "form_schema_tenant_api_id_unique" }
)

export const FormSchemaModel =
  (models.FormSchema as Model<FormSchemaRecord> | undefined) ??
  model<FormSchemaRecord>("FormSchema", formSchema)
