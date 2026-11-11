import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/app-header"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import {
  findFormForTenant,
  listFormSubmissions,
} from "@/lib/forms"
import { getTenantContext } from "@/lib/tenant-context"

export default async function FormSubmissionsPage({
  params,
}: PageProps<"/forms/[formId]/submissions">) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) redirect("/")

  const { formId } = await params
  const form = await findFormForTenant(currentTenant.id, formId)
  if (!form) notFound()

  const submissions = await listFormSubmissions(currentTenant.id, form.id)
  const fieldNames = new Map(
    form.fields.map((field) => [field.apiId, field.name])
  )

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <div className="flex items-center gap-1">
            <Link
              href={`/forms/${form.id}`}
              aria-label={`Back to ${form.name}`}
              title={`Back to ${form.name}`}
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "-ml-2",
              })}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Link>
            <p className="text-sm font-medium text-muted-foreground">
              {form.name}
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Submissions
          </h1>
          <p className="mt-3 text-muted-foreground">
            The latest {submissions.length} submission
            {submissions.length === 1 ? "" : "s"} received by this form.
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <h2 className="font-medium">No submissions yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New valid POST requests will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border bg-card p-6 shadow-sm"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                  <time
                    dateTime={submission.createdAt.toISOString()}
                    className="font-medium"
                  >
                    {formatSubmissionTime(submission.createdAt)}
                  </time>
                  <code className="text-xs text-muted-foreground">
                    {submission.id}
                  </code>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(submission.values).map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {fieldNames.get(key) ?? key}
                      </dt>
                      <dd className="mt-1 wrap-break-word whitespace-pre-wrap">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function formatSubmissionTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date)
}

function formatValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}
