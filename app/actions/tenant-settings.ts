"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { getTenantContext, setCurrentTenant } from "@/lib/tenant-context"
import { deleteTenant, updateTenantName } from "@/lib/tenants"
import { regenerateTenantApiToken } from "@/lib/tenant-api-token"

export type TenantSettingsState = {
  status?: "error" | "success"
  message?: string
  name?: string
}

export type ApiTokenState = {
  status?: "error" | "success"
  message?: string
  token?: string
}

export async function regenerateTenantApiTokenAction(
  _state: ApiTokenState
): Promise<ApiTokenState> {
  void _state
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return { status: "error", message: "Select a website first." }

  try {
    const token = await regenerateTenantApiToken(currentTenant.id, user.id)
    if (!token) return { status: "error", message: "Website could not be found." }
    revalidatePath("/settings")
    return { status: "success", message: "Copy this token now. It will not be shown again.", token }
  } catch (error) {
    console.error("API token generation failed", error)
    return { status: "error", message: "Could not generate an API token. Please try again." }
  }
}

function text(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

export async function updateTenantNameAction(
  _state: TenantSettingsState,
  formData: FormData
): Promise<TenantSettingsState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  const name = text(formData, "name")

  if (!currentTenant) {
    return { status: "error", message: "Select a website first.", name }
  }
  if (name.length < 2 || name.length > 80) {
    return {
      status: "error",
      message: "Website name must be between 2 and 80 characters.",
      name,
    }
  }

  try {
    const updated = await updateTenantName({
      tenantId: currentTenant.id,
      ownerId: user.id,
      name,
    })

    if (!updated) {
      return { status: "error", message: "Website could not be found.", name }
    }
  } catch (error) {
    console.error("Website update failed", error)
    return {
      status: "error",
      message: "Website updates are temporarily unavailable. Please try again.",
      name,
    }
  }

  revalidatePath("/")
  revalidatePath("/settings")
  return { status: "success", message: "Website name updated.", name }
}

export async function deleteTenantAction(
  _state: TenantSettingsState,
  formData: FormData
): Promise<TenantSettingsState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  const confirmation = text(formData, "confirmation")

  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }
  if (confirmation !== currentTenant.slug) {
    return {
      status: "error",
      message: `Type ${currentTenant.slug} exactly to confirm deletion.`,
    }
  }

  try {
    const deleted = await deleteTenant({
      tenantId: currentTenant.id,
      ownerId: user.id,
    })

    if (!deleted) {
      return { status: "error", message: "Website could not be found." }
    }

    await setCurrentTenant(null)
  } catch (error) {
    console.error("Website deletion failed", error)
    return {
      status: "error",
      message: "Website deletion is temporarily unavailable. Please try again.",
    }
  }

  redirect("/")
}
