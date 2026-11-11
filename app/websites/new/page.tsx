import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { WebsiteForm } from "@/components/website-form"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"

export const metadata = {
  title: "Add website · YACMS",
}

export default async function NewWebsitePage() {
  const user = await requireUser()

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">Websites</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Add a website
          </h1>
          <p className="mt-3 text-muted-foreground">
            Create a new tenant and make it the active website in your workspace.
          </p>
        </div>
        <WebsiteForm />
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", className: "mt-4" })}
        >
          Cancel
        </Link>
      </section>
    </main>
  )
}
