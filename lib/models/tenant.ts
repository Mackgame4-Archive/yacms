import "server-only"

import {
  model,
  models,
  Schema,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose"

export type TenantRecord = {
  ownerId: Types.ObjectId
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export type TenantDocument = HydratedDocument<TenantRecord>

const tenantSchema = new Schema<TenantRecord>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 63,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
  },
  { timestamps: true }
)

tenantSchema.index(
  { ownerId: 1, slug: 1 },
  { unique: true, name: "tenant_owner_slug_unique" }
)

export const TenantModel =
  (models.Tenant as Model<TenantRecord> | undefined) ??
  model<TenantRecord>("Tenant", tenantSchema)
