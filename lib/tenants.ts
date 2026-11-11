import "server-only"

import { Types } from "mongoose"

import { dbConnect } from "@/lib/mongodb"
import { TenantModel, type TenantDocument } from "@/lib/models/tenant"

export type SafeTenant = {
  id: string
  name: string
  slug: string
  createdAt: Date
}

function toSafeTenant(tenant: TenantDocument): SafeTenant {
  return {
    id: tenant._id.toString(),
    name: tenant.name,
    slug: tenant.slug,
    createdAt: tenant.createdAt,
  }
}

export async function listTenantsForUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) return []
  await dbConnect()

  const tenants = await TenantModel.find({ ownerId: new Types.ObjectId(userId) })
    .sort({ name: 1, _id: 1 })
    .exec()

  return tenants.map(toSafeTenant)
}

export async function findTenantForUser(tenantId: string, userId: string) {
  if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(userId)) {
    return null
  }

  await dbConnect()
  const tenant = await TenantModel.findOne({
    _id: new Types.ObjectId(tenantId),
    ownerId: new Types.ObjectId(userId),
  }).exec()

  return tenant ? toSafeTenant(tenant) : null
}

export async function createTenant(input: {
  ownerId: string
  name: string
  slug: string
}): Promise<SafeTenant | null> {
  if (!Types.ObjectId.isValid(input.ownerId)) return null

  await dbConnect()
  await TenantModel.init()

  try {
    const tenant = await TenantModel.create({
      ownerId: new Types.ObjectId(input.ownerId),
      name: input.name,
      slug: input.slug,
    })
    return toSafeTenant(tenant)
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return null
    throw error
  }
}

export async function updateTenantName(input: {
  tenantId: string
  ownerId: string
  name: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.ownerId)
  ) {
    return false
  }

  await dbConnect()
  const result = await TenantModel.updateOne(
    {
      _id: new Types.ObjectId(input.tenantId),
      ownerId: new Types.ObjectId(input.ownerId),
    },
    { $set: { name: input.name } },
    { runValidators: true }
  )

  return result.matchedCount === 1
}

export async function deleteTenant(input: {
  tenantId: string
  ownerId: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.ownerId)
  ) {
    return false
  }

  await dbConnect()
  const result = await TenantModel.deleteOne({
    _id: new Types.ObjectId(input.tenantId),
    ownerId: new Types.ObjectId(input.ownerId),
  })

  return result.deletedCount === 1
}
