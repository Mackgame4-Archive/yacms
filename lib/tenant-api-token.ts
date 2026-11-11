import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { Types } from "mongoose"

import { dbConnect } from "@/lib/mongodb"
import { TenantModel } from "@/lib/models/tenant"

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url")
}

export async function getTenantApiTokenInfo(tenantId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(ownerId)) return null
  await dbConnect()
  const tenant = await TenantModel.findOne({
    _id: new Types.ObjectId(tenantId),
    ownerId: new Types.ObjectId(ownerId),
  }).select("apiTokenLast4 apiTokenCreatedAt").lean().exec()
  return tenant?.apiTokenCreatedAt && tenant.apiTokenLast4
    ? { last4: tenant.apiTokenLast4, createdAt: tenant.apiTokenCreatedAt.toISOString() }
    : null
}

export async function regenerateTenantApiToken(tenantId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(ownerId)) return null
  const token = `yacms_${randomBytes(32).toString("base64url")}`
  await dbConnect()
  const tenant = await TenantModel.findOneAndUpdate(
    { _id: new Types.ObjectId(tenantId), ownerId: new Types.ObjectId(ownerId) },
    { $set: {
      apiTokenHash: hashToken(token),
      apiTokenLast4: token.slice(-4),
      apiTokenCreatedAt: new Date(),
    } },
    { new: true, runValidators: true }
  ).exec()
  return tenant ? token : null
}

export async function authenticateContentApi(tenantReference: string, authorization: string | null) {
  const match = /^Bearer (yacms_[A-Za-z0-9_-]{43})$/.exec(authorization ?? "")
  if (!match) return null
  await dbConnect()
  const reference = Types.ObjectId.isValid(tenantReference)
    ? { $or: [{ _id: new Types.ObjectId(tenantReference) }, { slug: tenantReference }] }
    : { slug: tenantReference }
  const tenant = await TenantModel.findOne({
    ...reference,
    apiTokenHash: hashToken(match[1]),
  }).select("_id").lean().exec()
  return tenant?._id.toString() ?? null
}
