import Image from "next/image"

import { logout } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"

export default async function Page() {
  const user = await requireUser()

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--color-muted),transparent_35%)]">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/cms-logo.svg"
              alt=""
              width={256}
              height={256}
              className="size-9"
              priority
            />
            <span className="font-semibold tracking-tight">YACMS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <form action={logout}>
              <Button type="submit" variant="outline">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Private workspace
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome back, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            This page is protected. Only people with a valid signed session can
            view its content.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ["Pages", "Create and organize content"],
            ["Media", "Keep assets in one place"],
            ["Settings", "Manage your workspace"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-8 size-2 rounded-full bg-primary" />
              <h2 className="font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
