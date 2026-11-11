import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft01Icon, Database01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/app-header"
import { CreateContentTypeForm } from "@/components/content-type-forms"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { listContentTypesForTenant } from "@/lib/content-types"
import { getTenantContext } from "@/lib/tenant-context"

export const metadata = {
  title: "Content types | YACMS",
}

export default async function ContentTypesPage() {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) redirect("/")

  const contentTypes = await listContentTypesForTenant(currentTenant.id)

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
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
            Content types
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Define the data structures this tenant exposes to connected
            websites. Types can reference one another through relation fields.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <div className="grid content-start gap-4">
            {contentTypes.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
                <h2 className="font-medium">No content types yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create the first schema for this website.
                </p>
              </div>
            ) : (
              contentTypes.map((contentType) => (
                <Link
                  key={contentType.id}
                  href={`/content-types/${contentType.id}`}
                  className="group rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <HugeiconsIcon icon={Database01Icon} strokeWidth={2} />
                    </div>
                    <code className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {contentType.apiId}
                    </code>
                  </div>
                  <h2 className="mt-6 font-medium">{contentType.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {contentType.description || "No description"}
                  </p>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">
                    {contentType.fields.length} field
                    {contentType.fields.length === 1 ? "" : "s"}
                  </p>
                </Link>
              ))
            )}
          </div>
          <CreateContentTypeForm />
        </div>
      </section>
    </main>
  )
}
