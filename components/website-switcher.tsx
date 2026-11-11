"use client"

import Link from "next/link"
import {
  Add01Icon,
  ArrowDown01Icon,
  GlobalIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { selectTenantAction } from "@/app/actions/tenants"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Website = {
  id: string
  name: string
  slug: string
}

export function WebsiteSwitcher({
  websites,
  currentWebsiteId,
}: {
  websites: Website[]
  currentWebsiteId?: string
}) {
  const currentWebsite = websites.find(
    (website) => website.id === currentWebsiteId
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="max-w-56 justify-start rounded-xl data-popup-open:bg-muted"
          />
        }
      >
        <HugeiconsIcon icon={GlobalIcon} strokeWidth={2} />
        <span className="truncate">
          {currentWebsite?.name ?? (websites.length ? "Select website" : "Websites")}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="ms-auto text-muted-foreground"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your websites</DropdownMenuLabel>
          {websites.length ? (
            websites.map((website) => (
              <form action={selectTenantAction} key={website.id}>
                <input type="hidden" name="tenantId" value={website.id} />
                <DropdownMenuItem
                  nativeButton
                  render={<button type="submit" className="w-full" />}
                >
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block truncate">{website.name}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {website.slug}
                    </span>
                  </span>
                  {website.id === currentWebsiteId && (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className="text-primary"
                    />
                  )}
                </DropdownMenuItem>
              </form>
            ))
          ) : (
            <DropdownMenuItem disabled>No websites yet</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/websites/new" />}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Add website
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
