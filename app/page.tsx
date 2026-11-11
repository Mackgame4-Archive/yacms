import { AppHeader } from "@/components/app-header"
import { WebsiteForm } from "@/components/website-form"
import { requireUser } from "@/lib/auth"
import { getTenantContext } from "@/lib/tenant-context"

export default async function Page() {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)

  if (!currentTenant) {
    return (
      <main className="min-h-svh bg-muted/30">
        <AppHeader user={user} />
        <section className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
          <div className="mb-8">
            <p className="text-sm font-medium text-muted-foreground">
              Welcome to YACMS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Create your first website
            </h1>
            <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
              Add a website to start creating pages, organizing media, and
              managing your content.
            </p>
          </div>
          <WebsiteForm />
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--color-muted),transparent_35%)]">
      <AppHeader user={user} />

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Private workspace
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome back, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            This page is protected. Only people with a valid database session
            can view its content.
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
