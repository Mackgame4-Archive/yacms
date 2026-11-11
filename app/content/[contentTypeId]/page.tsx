import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/app-header"
import {
  ContentEntryEditor,
  type RelationOptions,
} from "@/components/content-entry-editor"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import type { SafeContentType } from "@/lib/content-schema"
import { listContentEntries } from "@/lib/content-entries"
import {
  findContentTypeForTenant,
  listContentTypesForTenant,
} from "@/lib/content-types"
import { getTenantContext } from "@/lib/tenant-context"

export default async function ContentPage({
  params,
}: PageProps<"/content/[contentTypeId]">) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) redirect("/")

  const { contentTypeId } = await params
  const [contentType, contentTypes, entries] = await Promise.all([
    findContentTypeForTenant(currentTenant.id, contentTypeId),
    listContentTypesForTenant(currentTenant.id),
    listContentEntries({ tenantId: currentTenant.id, contentTypeId }),
  ])
  if (!contentType) notFound()

  const relationOptions = await buildRelationOptions(
    currentTenant.id,
    contentType,
    contentTypes
  )

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <div className="flex items-center gap-1">
            <Link
              href={`/content-types/${contentType.id}`}
              aria-label="Back to content type"
              title="Back to content type"
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "-ml-2",
              })}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Link>
            <p className="text-sm font-medium text-muted-foreground">
              {contentType.name}
            </p>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Content entries
          </h1>
          <p className="mt-3 text-muted-foreground">
            Draft and publish records using the tenant-defined schema.
          </p>
        </div>
        <ContentEntryEditor
          contentType={contentType}
          entries={entries}
          relationOptions={relationOptions}
        />
      </section>
    </main>
  )
}

async function buildRelationOptions(
  tenantId: string,
  contentType: SafeContentType,
  contentTypes: SafeContentType[]
) {
  const options: RelationOptions = {}
  const relationFields = contentType.fields.filter(
    (field) => field.type === "relation" && field.relatedContentTypeId
  )

  await Promise.all(
    relationFields.map(async (field) => {
      const target = contentTypes.find(
        (type) => type.id === field.relatedContentTypeId
      )
      if (!target) return
      const entries = await listContentEntries({
        tenantId,
        contentTypeId: target.id,
      })
      const labelField = target.fields.find(
        (item) => item.type === "shortText" && !item.multiple
      )
      options[field.apiId] = entries.map((entry) => ({
        value: entry.id,
        label:
          (labelField && String(entry.values[labelField.apiId] ?? "")) ||
          `${target.name} ${entry.id.slice(-6)}`,
      }))
    })
  )

  return options
}
