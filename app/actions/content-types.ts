"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { fieldTypes, type FieldType } from "@/lib/content-schema"
import {
  addContentTypeField,
  createContentType,
  deleteContentTypeField,
  findContentTypeForTenant,
  updateContentType,
} from "@/lib/content-types"
import { getTenantContext } from "@/lib/tenant-context"

const reservedApiIds = new Set(["id", "created-at", "updated-at", "status"])

export type ContentTypeFormState = {
  status?: "error" | "success"
  message?: string
}

function text(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

function apiIdFrom(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/-+$/, "")
}

function validApiId(apiId: string) {
  return (
    apiId.length >= 2 &&
    apiId.length <= 63 &&
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(apiId) &&
    !reservedApiIds.has(apiId)
  )
}

export async function createContentTypeAction(
  _state: ContentTypeFormState,
  formData: FormData
): Promise<ContentTypeFormState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }

  const name = text(formData, "name")
  const apiId = apiIdFrom(text(formData, "apiId") || name)
  const description = text(formData, "description")
  if (name.length < 2 || name.length > 80) {
    return { status: "error", message: "Name must be 2–80 characters." }
  }
  if (!validApiId(apiId)) {
    return {
      status: "error",
      message: "API ID must start with a letter and use lowercase letters, numbers, or hyphens.",
    }
  }
  if (description.length > 500) {
    return { status: "error", message: "Description is too long." }
  }

  const contentType = await createContentType({
    tenantId: currentTenant.id,
    name,
    apiId,
    description,
  })
  if (!contentType) {
    return {
      status: "error",
      message: "A content type with this API ID already exists.",
    }
  }

  redirect(`/content-types/${contentType.id}`)
}

export async function updateContentTypeAction(
  _state: ContentTypeFormState,
  formData: FormData
): Promise<ContentTypeFormState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }

  const contentTypeId = text(formData, "contentTypeId")
  const name = text(formData, "name")
  const description = text(formData, "description")
  if (name.length < 2 || name.length > 80 || description.length > 500) {
    return { status: "error", message: "Check the name and description." }
  }

  const updated = await updateContentType({
    tenantId: currentTenant.id,
    contentTypeId,
    name,
    description,
  })
  if (!updated) {
    return { status: "error", message: "Content type could not be found." }
  }

  revalidatePath("/content-types")
  revalidatePath(`/content-types/${contentTypeId}`)
  return { status: "success", message: "Content type updated." }
}

export async function addContentTypeFieldAction(
  _state: ContentTypeFormState,
  formData: FormData
): Promise<ContentTypeFormState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }

  const contentTypeId = text(formData, "contentTypeId")
  const name = text(formData, "name")
  const apiId = apiIdFrom(text(formData, "apiId") || name)
  const requestedType = text(formData, "type")
  const type = fieldTypes.includes(requestedType as FieldType)
    ? (requestedType as FieldType)
    : null
  const relatedContentTypeId = text(formData, "relatedContentTypeId")

  if (name.length < 1 || name.length > 80 || !validApiId(apiId) || !type) {
    return { status: "error", message: "Enter a valid field definition." }
  }
  if (type === "relation" && !relatedContentTypeId) {
    return { status: "error", message: "Choose a related content type." }
  }

  const contentType = await findContentTypeForTenant(
    currentTenant.id,
    contentTypeId
  )
  if (!contentType) {
    return { status: "error", message: "Content type could not be found." }
  }

  const updated = await addContentTypeField({
    tenantId: currentTenant.id,
    contentTypeId,
    name,
    apiId,
    type,
    required: formData.get("required") === "on",
    multiple: type !== "boolean" && formData.get("multiple") === "on",
    relatedContentTypeId:
      type === "relation" ? relatedContentTypeId : undefined,
  })
  if (!updated) {
    return {
      status: "error",
      message: "That API ID is already used or the relation is invalid.",
    }
  }

  revalidatePath(`/content-types/${contentTypeId}`)
  return { status: "success", message: "Field added." }
}

export async function deleteContentTypeFieldAction(formData: FormData) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return

  const contentTypeId = text(formData, "contentTypeId")
  await deleteContentTypeField({
    tenantId: currentTenant.id,
    contentTypeId,
    fieldId: text(formData, "fieldId"),
  })
  revalidatePath(`/content-types/${contentTypeId}`)
}
