import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { deleteFormFieldAction } from "@/app/actions/forms"
import { AppHeader } from "@/components/app-header"
import {
  AddFormFieldForm,
  FormEndpointField,
  FormSchemaDetailsForm,
} from "@/components/form-schema-forms"
import { Button, buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { findFormForTenant } from "@/lib/forms"
import { getTenantContext } from "@/lib/tenant-context"

export default async function FormSchemaPage({
  params,
}: PageProps<"/forms/[formId]">) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) redirect("/")

  const { formId } = await params
  const form = await findFormForTenant(currentTenant.id, formId)
  if (!form) notFound()

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <div className="flex items-center gap-1">
            <Link
              href="/forms"
              aria-label="Back to forms"
              title="Back to forms"
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "-ml-2",
              })}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Link>
            <p className="text-sm font-medium text-muted-foreground">Forms</p>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {form.name}
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            {form.apiId}
          </p>
        </div>

        <FormEndpointField
          tenantSlug={currentTenant.slug}
          formApiId={form.apiId}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <FormSchemaDetailsForm form={form} />
          <AddFormFieldForm formId={form.id} />
        </div>

        <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Fields</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only these keys are accepted by the submission endpoint.
            </p>
          </div>
          {form.fields.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No fields defined.
            </p>
          ) : (
            <div className="grid gap-3">
              {form.fields.map((field) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div>
                    <p className="font-medium">{field.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <code>{field.apiId}</code> · {field.type}
                      {field.required ? " · required" : ""}
                    </p>
                  </div>
                  <form action={deleteFormFieldAction}>
                    <input type="hidden" name="formId" value={form.id} />
                    <input type="hidden" name="fieldId" value={field.id} />
                    <Button type="submit" size="sm" variant="destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
