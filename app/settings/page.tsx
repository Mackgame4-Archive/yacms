import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/app-header"
import { TenantSettingsForms } from "@/components/tenant-settings-forms"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { getTenantContext } from "@/lib/tenant-context"
import { getTenantApiTokenInfo } from "@/lib/tenant-api-token"
import { getSmtpSettings } from "@/lib/smtp-settings"

export const metadata = {
  title: "Website settings · YACMS",
}

export default async function SettingsPage() {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)

  if (!currentTenant) redirect("/")
  const [apiTokenInfo, smtpSettings] = await Promise.all([
    getTenantApiTokenInfo(currentTenant.id, user.id),
    getSmtpSettings(currentTenant.id),
  ])

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <div className="flex items-center gap-1">
            <Link
              href="/"
              aria-label="Back to dashboard"
              title="Back to dashboard"
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "-ml-2",
              })}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Link>
            <p className="text-sm font-medium text-muted-foreground">
              {currentTenant.name}
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Website settings
          </h1>
          <p className="mt-3 text-muted-foreground">
            Manage this website&apos;s identity, API access, email, and lifecycle.
          </p>
        </div>
        <TenantSettingsForms
          name={currentTenant.name}
          slug={currentTenant.slug}
          apiTokenInfo={apiTokenInfo}
          smtpSettings={smtpSettings}
        />
      </section>
    </main>
  )
}
