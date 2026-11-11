"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import {
  formFieldTypes,
  type FormFieldType,
} from "@/lib/form-schema"
import {
  addFormField,
  createFormSchema,
  deleteFormField,
  updateFormSchema,
} from "@/lib/forms"
import { getTenantContext } from "@/lib/tenant-context"

export type FormSchemaActionState = {
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
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(apiId)
  )
}

export async function createFormSchemaAction(
  _state: FormSchemaActionState,
  formData: FormData
): Promise<FormSchemaActionState> {
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
      message:
        "API ID must start with a letter and use lowercase letters, numbers, or hyphens.",
    }
  }
  if (description.length > 500) {
    return { status: "error", message: "Description is too long." }
  }

  const form = await createFormSchema({
    tenantId: currentTenant.id,
    name,
    apiId,
    description,
  })
  if (!form) {
    return {
      status: "error",
      message: "A form with this API ID already exists.",
    }
  }
  redirect(`/forms/${form.id}`)
}

export async function updateFormSchemaAction(
  _state: FormSchemaActionState,
  formData: FormData
): Promise<FormSchemaActionState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }

  const formId = text(formData, "formId")
  const name = text(formData, "name")
  const description = text(formData, "description")
  if (name.length < 2 || name.length > 80 || description.length > 500) {
    return { status: "error", message: "Check the name and description." }
  }

  const updated = await updateFormSchema({
    tenantId: currentTenant.id,
    formId,
    name,
    description,
  })
  if (!updated) {
    return { status: "error", message: "Form could not be found." }
  }
  revalidatePath("/forms")
  revalidatePath(`/forms/${formId}`)
  return { status: "success", message: "Form updated." }
}

export async function addFormFieldAction(
  _state: FormSchemaActionState,
  formData: FormData
): Promise<FormSchemaActionState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }

  const formId = text(formData, "formId")
  const name = text(formData, "name")
  const apiId = apiIdFrom(text(formData, "apiId") || name)
  const requestedType = text(formData, "type")
  const type = formFieldTypes.includes(requestedType as FormFieldType)
    ? (requestedType as FormFieldType)
    : null
  if (name.length < 1 || name.length > 80 || !validApiId(apiId) || !type) {
    return { status: "error", message: "Enter a valid field definition." }
  }

  const updated = await addFormField({
    tenantId: currentTenant.id,
    formId,
    name,
    apiId,
    type,
    required: formData.get("required") === "on",
  })
  if (!updated) {
    return {
      status: "error",
      message: "That API ID is already used or the form no longer exists.",
    }
  }
  revalidatePath(`/forms/${formId}`)
  return { status: "success", message: "Field added." }
}

export async function deleteFormFieldAction(formData: FormData) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return

  const formId = text(formData, "formId")
  await deleteFormField({
    tenantId: currentTenant.id,
    formId,
    fieldId: text(formData, "fieldId"),
  })
  revalidatePath(`/forms/${formId}`)
}
