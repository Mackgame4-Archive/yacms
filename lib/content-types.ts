import "server-only"

import { randomUUID } from "node:crypto"
import { Types } from "mongoose"

import type { SafeContentType } from "@/lib/content-schema"
import { dbConnect } from "@/lib/mongodb"
import { ContentEntryModel } from "@/lib/models/content-entry"
import {
  ContentTypeModel,
  type ContentTypeDocument,
} from "@/lib/models/content-type"
import type { FieldType } from "@/lib/content-schema"

export type { SafeContentType, SafeFieldDefinition } from "@/lib/content-schema"

function toSafeContentType(contentType: ContentTypeDocument): SafeContentType {
  return {
    id: contentType._id.toString(),
    name: contentType.name,
    apiId: contentType.apiId,
    description: contentType.description,
    fields: contentType.fields.map((field) => ({
      id: field.id,
      name: field.name,
      apiId: field.apiId,
      type: field.type,
      required: field.required,
      multiple: field.multiple,
      relatedContentTypeId: field.relatedContentTypeId?.toString(),
    })),
    createdAt: contentType.createdAt,
    updatedAt: contentType.updatedAt,
  }
}

export async function listContentTypesForTenant(tenantId: string) {
  if (!Types.ObjectId.isValid(tenantId)) return []
  await dbConnect()
  const contentTypes = await ContentTypeModel.find({
    tenantId: new Types.ObjectId(tenantId),
  })
    .sort({ name: 1, _id: 1 })
    .exec()
  return contentTypes.map(toSafeContentType)
}

export async function findContentTypeForTenant(
  tenantId: string,
  contentTypeId: string
) {
  if (
    !Types.ObjectId.isValid(tenantId) ||
    !Types.ObjectId.isValid(contentTypeId)
  ) {
    return null
  }
  await dbConnect()
  const contentType = await ContentTypeModel.findOne({
    _id: new Types.ObjectId(contentTypeId),
    tenantId: new Types.ObjectId(tenantId),
  }).exec()
  return contentType ? toSafeContentType(contentType) : null
}

export async function findContentTypeByApiId(
  tenantId: string,
  apiId: string
) {
  if (!Types.ObjectId.isValid(tenantId)) return null
  await dbConnect()
  const contentType = await ContentTypeModel.findOne({
    tenantId: new Types.ObjectId(tenantId),
    apiId,
  }).exec()
  return contentType ? toSafeContentType(contentType) : null
}

export async function createContentType(input: {
  tenantId: string
  name: string
  apiId: string
  description: string
}) {
  if (!Types.ObjectId.isValid(input.tenantId)) return null
  await dbConnect()
  await ContentTypeModel.init()

  try {
    const contentType = await ContentTypeModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      name: input.name,
      apiId: input.apiId,
      description: input.description,
      fields: [],
    })
    return toSafeContentType(contentType)
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return null
    throw error
  }
}

export async function updateContentType(input: {
  tenantId: string
  contentTypeId: string
  name: string
  description: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.contentTypeId)
  ) {
    return null
  }
  await dbConnect()
  const contentType = await ContentTypeModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(input.contentTypeId),
      tenantId: new Types.ObjectId(input.tenantId),
    },
    { $set: { name: input.name, description: input.description } },
    { new: true, runValidators: true }
  ).exec()
  return contentType ? toSafeContentType(contentType) : null
}

export async function addContentTypeField(input: {
  tenantId: string
  contentTypeId: string
  name: string
  apiId: string
  type: FieldType
  required: boolean
  multiple: boolean
  relatedContentTypeId?: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.contentTypeId)
  ) {
    return null
  }
  await dbConnect()

  const contentType = await ContentTypeModel.findOne({
    _id: new Types.ObjectId(input.contentTypeId),
    tenantId: new Types.ObjectId(input.tenantId),
    "fields.apiId": { $ne: input.apiId },
  }).exec()
  if (!contentType) return null

  if (input.type === "relation") {
    if (
      !input.relatedContentTypeId ||
      !Types.ObjectId.isValid(input.relatedContentTypeId)
    ) {
      return null
    }
    const relationTarget = await ContentTypeModel.exists({
      _id: new Types.ObjectId(input.relatedContentTypeId),
      tenantId: new Types.ObjectId(input.tenantId),
    })
    if (!relationTarget) return null
  }

  contentType.fields.push({
    id: randomUUID(),
    name: input.name,
    apiId: input.apiId,
    type: input.type,
    required: input.required,
    multiple: input.multiple,
    relatedContentTypeId: input.relatedContentTypeId
      ? new Types.ObjectId(input.relatedContentTypeId)
      : undefined,
  })
  await contentType.save()
  return toSafeContentType(contentType)
}

export async function deleteContentTypeField(input: {
  tenantId: string
  contentTypeId: string
  fieldId: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.contentTypeId)
  ) {
    return false
  }
  await dbConnect()
  const contentType = await ContentTypeModel.findOne({
    _id: new Types.ObjectId(input.contentTypeId),
    tenantId: new Types.ObjectId(input.tenantId),
  }).exec()
  if (!contentType) return false

  const field = contentType.fields.find((item) => item.id === input.fieldId)
  if (!field) return false
  contentType.fields = contentType.fields.filter(
    (item) => item.id !== input.fieldId
  )
  await contentType.save()
  await ContentEntryModel.updateMany(
    {
      tenantId: new Types.ObjectId(input.tenantId),
      contentTypeId: new Types.ObjectId(input.contentTypeId),
    },
    { $unset: { [`values.${field.apiId}`]: "" } }
  )
  return true
}
