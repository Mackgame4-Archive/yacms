import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeft01Icon,
  ConnectIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { deleteContentTypeFieldAction } from "@/app/actions/content-types"
import { AppHeader } from "@/components/app-header"
import {
  AddContentTypeFieldForm,
  ContentTypeDetailsForm,
} from "@/components/content-type-forms"
import { Button, buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import {
  findContentTypeForTenant,
  listContentTypesForTenant,
} from "@/lib/content-types"
import { getTenantContext } from "@/lib/tenant-context"

export default async function ContentTypePage({
  params,
}: PageProps<"/content-types/[contentTypeId]">) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) redirect("/")

  const { contentTypeId } = await params
  const [contentType, contentTypes] = await Promise.all([
    findContentTypeForTenant(currentTenant.id, contentTypeId),
    listContentTypesForTenant(currentTenant.id),
  ])
  if (!contentType) notFound()

  const names = new Map(contentTypes.map((type) => [type.id, type.name]))

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-1">
              <Link
                href="/content-types"
                aria-label="Back to content types"
                title="Back to content types"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className: "-ml-2",
                })}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              </Link>
              <p className="text-sm font-medium text-muted-foreground">
                Content types
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {contentType.name}
            </h1>
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              {contentType.apiId}
            </p>
          </div>
          <Link
            href={`/content/${contentType.id}`}
            className={buttonVariants({ variant: "default" })}
          >
            Manage entries
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ContentTypeDetailsForm contentType={contentType} />
          <AddContentTypeFieldForm
            contentTypeId={contentType.id}
            contentTypes={contentTypes}
          />
        </div>

        <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Fields</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This schema drives the editor and public API response.
            </p>
          </div>
          {contentType.fields.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No fields defined.
            </p>
          ) : (
            <div className="grid gap-3">
              {contentType.fields.map((field) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="flex items-center gap-3">
                    {field.type === "relation" && (
                      <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <HugeiconsIcon icon={ConnectIcon} strokeWidth={2} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{field.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <code>{field.apiId}</code> · {field.type}
                        {field.multiple ? " · multiple" : ""}
                        {field.required ? " · required" : ""}
                        {field.relatedContentTypeId
                          ? ` · ${names.get(field.relatedContentTypeId) ?? "Unknown type"}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <form action={deleteContentTypeFieldAction}>
                    <input
                      type="hidden"
                      name="contentTypeId"
                      value={contentType.id}
                    />
                    <input type="hidden" name="fieldId" value={field.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${field.name}`}
                      title={`Delete ${field.name}`}
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
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
