import "server-only"

import { model, models, Schema, type Model, type Types } from "mongoose"

export type SmtpSettingsRecord = {
  tenantId: Types.ObjectId
  host: string
  port: number
  security: "none" | "starttls" | "tls"
  username: string
  encryptedPassword?: string
  fromName: string
  fromEmail: string
  createdAt: Date
  updatedAt: Date
}

const smtpSettingsSchema = new Schema<SmtpSettingsRecord>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },
    host: { type: String, required: true, trim: true, maxlength: 255 },
    port: { type: Number, required: true, min: 1, max: 65535 },
    security: {
      type: String,
      enum: ["none", "starttls", "tls"],
      required: true,
      default: "starttls",
    },
    username: { type: String, trim: true, maxlength: 255, default: "" },
    encryptedPassword: { type: String, select: false },
    fromName: { type: String, required: true, trim: true, maxlength: 120 },
    fromEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
  },
  { timestamps: true }
)

export const SmtpSettingsModel =
  (models.SmtpSettings as Model<SmtpSettingsRecord> | undefined) ??
  model<SmtpSettingsRecord>("SmtpSettings", smtpSettingsSchema)
