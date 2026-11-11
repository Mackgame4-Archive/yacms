import { AppHeader } from "@/components/app-header"
import { requireUser } from "@/lib/auth"

export default async function Page() {
  const user = await requireUser()

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
