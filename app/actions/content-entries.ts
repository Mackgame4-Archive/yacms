"use server"

import { Types } from "mongoose"
import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import type { SafeFieldDefinition } from "@/lib/content-schema"
import {
  deleteContentEntry,
  saveContentEntry,
} from "@/lib/content-entries"
import { findContentTypeForTenant } from "@/lib/content-types"
import { dbConnect } from "@/lib/mongodb"
import { ContentEntryModel } from "@/lib/models/content-entry"
import { getTenantContext } from "@/lib/tenant-context"
import { mediaIdsExist } from "@/lib/media"

export type ContentEntryFormState = {
  status?: "error" | "success"
  message?: string
}

function text(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

export async function saveContentEntryAction(
  _state: ContentEntryFormState,
  formData: FormData
): Promise<ContentEntryFormState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }

  const contentTypeId = text(formData, "contentTypeId")
  const contentType = await findContentTypeForTenant(
    currentTenant.id,
    contentTypeId
  )
  if (!contentType) {
    return { status: "error", message: "Content type could not be found." }
  }

  const parsed = await parseValues(
    formData,
    contentType.fields,
    currentTenant.id
  )
  if ("error" in parsed) return { status: "error", message: parsed.error }

  const saved = await saveContentEntry({
    tenantId: currentTenant.id,
    contentTypeId,
    entryId: text(formData, "entryId") || undefined,
    values: parsed.values,
    status: formData.get("published") === "on" ? "published" : "draft",
  })
  if (!saved) {
    return { status: "error", message: "Entry could not be saved." }
  }

  revalidatePath(`/content/${contentTypeId}`)
  return { status: "success", message: "Entry saved." }
}

export async function deleteContentEntryAction(formData: FormData) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return

  const contentTypeId = text(formData, "contentTypeId")
  await deleteContentEntry({
    tenantId: currentTenant.id,
    contentTypeId,
    entryId: text(formData, "entryId"),
  })
  revalidatePath(`/content/${contentTypeId}`)
}

async function parseValues(
  formData: FormData,
  fields: SafeFieldDefinition[],
  tenantId: string
): Promise<{ values: Record<string, unknown> } | { error: string }> {
  const values: Record<string, unknown> = {}

  for (const field of fields) {
    const rawValues = field.multiple
      ? formData
          .getAll(field.apiId)
          .flatMap((value) =>
            typeof value === "string" ? value.split("\n") : []
          )
          .map((value) => value.trim())
          .filter(Boolean)
      : [text(formData, field.apiId)].filter(Boolean)

    if (field.type === "boolean") {
      values[field.apiId] = formData.get(field.apiId) === "on"
      continue
    }
    if (field.required && rawValues.length === 0) {
      return { error: `${field.name} is required.` }
    }

    const converted: unknown[] = []
    for (const value of rawValues) {
      if (field.type === "number") {
        const number = Number(value)
        if (!Number.isFinite(number)) {
          return { error: `${field.name} must be a number.` }
        }
        converted.push(number)
      } else if (field.type === "media") {
        if (!(await mediaIdsExist(tenantId, [value]))) return { error: `${field.name} must reference media from this website.` }
        converted.push(value)
      } else if (field.type === "url") {
        if (!isUrlOrPath(value)) {
          return { error: `${field.name} must be a URL or absolute path.` }
        }
        converted.push(value)
      } else if (field.type === "relation") {
        if (!Types.ObjectId.isValid(value) || !field.relatedContentTypeId) {
          return { error: `${field.name} contains an invalid relation.` }
        }
        const relationExists = await relatedEntryExists({
          tenantId,
          contentTypeId: field.relatedContentTypeId,
          entryId: value,
        })
        if (!relationExists) {
          return { error: `${field.name} contains an invalid relation.` }
        }
        converted.push(value)
      } else {
        converted.push(value)
      }
    }

    values[field.apiId] = field.multiple ? converted : converted[0] ?? null
  }

  return { values }
}

function isUrlOrPath(value: string) {
  if (value.startsWith("/")) return true
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

async function relatedEntryExists(input: {
  tenantId: string
  contentTypeId: string
  entryId: string
}) {
  await dbConnect()
  return ContentEntryModel.exists({
    _id: new Types.ObjectId(input.entryId),
    tenantId: new Types.ObjectId(input.tenantId),
    contentTypeId: new Types.ObjectId(input.contentTypeId),
  })
}
