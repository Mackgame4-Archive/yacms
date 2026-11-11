import Image from "next/image"
import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { WebsiteSwitcher } from "@/components/website-switcher"
import { getTenantContext } from "@/lib/tenant-context"
import type { SafeUser } from "@/lib/users"

export async function AppHeader({ user }: { user: SafeUser }) {
  const { tenants, currentTenant } = await getTenantContext(user.id)

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3"
            aria-label="YACMS home"
          >
            <Image
              src="/cms-logo.svg"
              alt=""
              width={256}
              height={256}
              className="size-9"
              priority
            />
            <span className="hidden font-semibold tracking-tight sm:inline">
              YACMS
            </span>
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <WebsiteSwitcher
            websites={tenants.map(({ id, name, slug }) => ({ id, name, slug }))}
            currentWebsiteId={currentTenant?.id}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} />
        </div>
      </div>
    </header>
  )
}
