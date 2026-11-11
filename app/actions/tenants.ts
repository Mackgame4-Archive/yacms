"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { setCurrentTenant } from "@/lib/tenant-context"
import { createTenant, findTenantForUser } from "@/lib/tenants"

export type TenantFormState = {
  error?: string
  fields?: {
    name?: string
    slug?: string
  }
}

function text(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function validSlug(slug: string) {
  return (
    slug.length >= 2 &&
    slug.length <= 63 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  )
}

export async function selectTenantAction(formData: FormData) {
  const user = await requireUser()
  const tenantId = text(formData, "tenantId")
  const tenant = await findTenantForUser(tenantId, user.id)

  if (!tenant) return

  await setCurrentTenant(tenant.id)
  revalidatePath("/")
  revalidatePath("/profile")
  revalidatePath("/websites/new")
}

export async function unselectTenantAction() {
  await requireUser()
  await setCurrentTenant(null)
  revalidatePath("/")
  revalidatePath("/profile")
  revalidatePath("/websites/new")
}

export async function createTenantAction(
  _state: TenantFormState,
  formData: FormData
): Promise<TenantFormState> {
  const user = await requireUser()
  const name = text(formData, "name")
  const requestedSlug = text(formData, "slug")
  const slug = slugify(requestedSlug || name)
  const fields = { name, slug }

  if (name.length < 2 || name.length > 80) {
    return {
      error: "Website name must be between 2 and 80 characters.",
      fields,
    }
  }
  if (!validSlug(slug)) {
    return {
      error: "Slug must be 2–63 lowercase letters, numbers, or single hyphens.",
      fields,
    }
  }

  let tenant
  try {
    tenant = await createTenant({ ownerId: user.id, name, slug })
    if (tenant) await setCurrentTenant(tenant.id)
  } catch (error) {
    console.error("Website creation failed", error)
    return {
      error: "Website creation is temporarily unavailable. Please try again.",
      fields,
    }
  }

  if (!tenant) {
    return {
      error: "You already have a website with this slug.",
      fields,
    }
  }

  redirect("/")
}
