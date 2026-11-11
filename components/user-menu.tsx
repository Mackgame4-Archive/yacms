"use client"

import Link from "next/link"
import {
  ArrowDown01Icon,
  Logout01Icon,
  ProfileIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { logout } from "@/app/actions/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto rounded-full py-1 pe-2 ps-1 data-popup-open:bg-muted"
            aria-label={`Open account menu for ${name}`}
          />
        }
      >
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/10 font-medium text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-36 truncate sm:inline">{name}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-4 text-muted-foreground"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="truncate font-normal">{email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <HugeiconsIcon icon={ProfileIcon} strokeWidth={2} />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem
            variant="destructive"
            nativeButton
            render={<button type="submit" className="w-full" />}
          >
            <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
            Log out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
