import "server-only"

import { Types } from "mongoose"

import type { SafeContentEntry } from "@/lib/content-schema"
import { dbConnect } from "@/lib/mongodb"
import {
  ContentEntryModel,
  type ContentEntryDocument,
} from "@/lib/models/content-entry"

export type { SafeContentEntry } from "@/lib/content-schema"

function toSafeContentEntry(entry: ContentEntryDocument): SafeContentEntry {
  return {
    id: entry._id.toString(),
    values: Object.fromEntries(entry.values),
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

export async function listContentEntries(input: {
  tenantId: string
  contentTypeId: string
  publishedOnly?: boolean
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.contentTypeId)
  ) {
    return []
  }
  await dbConnect()
  const query: {
    tenantId: Types.ObjectId
    contentTypeId: Types.ObjectId
    status?: "published"
  } = {
    tenantId: new Types.ObjectId(input.tenantId),
    contentTypeId: new Types.ObjectId(input.contentTypeId),
  }
  if (input.publishedOnly) query.status = "published"

  const entries = await ContentEntryModel.find(query)
    .sort({ createdAt: 1, _id: 1 })
    .exec()
  return entries.map(toSafeContentEntry)
}

export async function findContentEntry(input: {
  tenantId: string
  contentTypeId: string
  entryId: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.contentTypeId) ||
    !Types.ObjectId.isValid(input.entryId)
  ) {
    return null
  }
  await dbConnect()
  const entry = await ContentEntryModel.findOne({
    _id: new Types.ObjectId(input.entryId),
    tenantId: new Types.ObjectId(input.tenantId),
    contentTypeId: new Types.ObjectId(input.contentTypeId),
  }).exec()
  return entry ? toSafeContentEntry(entry) : null
}

export async function saveContentEntry(input: {
  tenantId: string
  contentTypeId: string
  entryId?: string
  values: Record<string, unknown>
  status: "draft" | "published"
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.contentTypeId)
  ) {
    return null
  }
  await dbConnect()

  if (input.entryId) {
    if (!Types.ObjectId.isValid(input.entryId)) return null
    const entry = await ContentEntryModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(input.entryId),
        tenantId: new Types.ObjectId(input.tenantId),
        contentTypeId: new Types.ObjectId(input.contentTypeId),
      },
      { $set: { values: input.values, status: input.status } },
      { new: true, runValidators: true }
    ).exec()
    return entry ? toSafeContentEntry(entry) : null
  }

  const entry = await ContentEntryModel.create({
    tenantId: new Types.ObjectId(input.tenantId),
    contentTypeId: new Types.ObjectId(input.contentTypeId),
    values: input.values,
    status: input.status,
  })
  return toSafeContentEntry(entry)
}

export async function deleteContentEntry(input: {
  tenantId: string
  contentTypeId: string
  entryId: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.contentTypeId) ||
    !Types.ObjectId.isValid(input.entryId)
  ) {
    return false
  }
  await dbConnect()
  const result = await ContentEntryModel.deleteOne({
    _id: new Types.ObjectId(input.entryId),
    tenantId: new Types.ObjectId(input.tenantId),
    contentTypeId: new Types.ObjectId(input.contentTypeId),
  })
  return result.deletedCount === 1
}
