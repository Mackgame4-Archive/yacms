import "server-only"

import { createCipheriv, randomBytes } from "node:crypto"
import { Types } from "mongoose"

import { dbConnect } from "@/lib/mongodb"
import { SmtpSettingsModel } from "@/lib/models/smtp-settings"

export type SafeSmtpSettings = {
  host: string
  port: number
  security: "none" | "starttls" | "tls"
  username: string
  fromName: string
  fromEmail: string
  hasPassword: boolean
}

function encryptionKey() {
  const encoded =
    process.env.SMTP_ENCRYPTION_KEY ?? process.env.MEDIA_ENCRYPTION_KEY
  const key = encoded ? Buffer.from(encoded, "base64") : null
  if (!key || key.length !== 32) {
    throw new Error(
      "SMTP_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
    )
  }
  return key
}

function encrypt(password: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ])
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".")
}

export async function getSmtpSettings(
  tenantId: string
): Promise<SafeSmtpSettings | null> {
  if (!Types.ObjectId.isValid(tenantId)) return null
  await dbConnect()
  const settings = await SmtpSettingsModel.findOne({
    tenantId: new Types.ObjectId(tenantId),
  })
    .select("+encryptedPassword")
    .lean()
    .exec()
  return settings
    ? {
        host: settings.host,
        port: settings.port,
        security: settings.security,
        username: settings.username,
        fromName: settings.fromName,
        fromEmail: settings.fromEmail,
        hasPassword: Boolean(settings.encryptedPassword),
      }
    : null
}

export async function updateSmtpSettings(input: {
  tenantId: string
  host: string
  port: number
  security: "none" | "starttls" | "tls"
  username: string
  password?: string
  fromName: string
  fromEmail: string
}) {
  if (!Types.ObjectId.isValid(input.tenantId)) return false
  await dbConnect()

  const update: Record<string, unknown> = {
    host: input.host,
    port: input.port,
    security: input.security,
    username: input.username,
    fromName: input.fromName,
    fromEmail: input.fromEmail,
  }
  if (input.password) update.encryptedPassword = encrypt(input.password)

  const settings = await SmtpSettingsModel.findOneAndUpdate(
    { tenantId: new Types.ObjectId(input.tenantId) },
    { $set: update, $setOnInsert: { tenantId: new Types.ObjectId(input.tenantId) } },
    { upsert: true, new: true, runValidators: true }
  ).exec()
  return Boolean(settings)
}
