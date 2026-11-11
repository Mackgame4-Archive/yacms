import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"

import { listTenantsForUser } from "@/lib/tenants"

const tenantCookieName = "yacms_tenant_v1"
const noTenantSelected = "none"

function shouldUseSecureCookies() {
  if (process.env.COOKIE_SECURE === "false") return false
  if (process.env.COOKIE_SECURE === "true") return true
  return process.env.NODE_ENV === "production"
}

export const getTenantContext = cache(async (userId: string) => {
  const [tenants, cookieStore] = await Promise.all([
    listTenantsForUser(userId),
    cookies(),
  ])
  const selectedId = cookieStore.get(tenantCookieName)?.value
  const currentTenant =
    selectedId === noTenantSelected
      ? null
      : tenants.find((tenant) => tenant.id === selectedId) ?? tenants[0] ?? null

  return { tenants, currentTenant }
})

export async function setCurrentTenant(tenantId: string | null) {
  const cookieStore = await cookies()
  cookieStore.set(tenantCookieName, tenantId ?? noTenantSelected, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  })
}
