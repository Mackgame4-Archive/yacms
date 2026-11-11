import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AppHeader } from "@/components/app-header"
import { FileExplorer, type ExplorerFolder } from "@/components/file-explorer"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { listBucket, validPrefix } from "@/lib/bucket-explorer"
import { getTenantContext } from "@/lib/tenant-context"
import { listConnections } from "@/lib/media"

export default async function ConnectionPage({ params, searchParams }: PageProps<"/media/[connectionId]">) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) redirect("/")
  const { connectionId } = await params
  const query = await searchParams
  const prefix = typeof query.prefix === "string" ? query.prefix : ""
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined
  if (!validPrefix(prefix)) notFound()
  const connection = (await listConnections(currentTenant.id)).find((item) => item.id === connectionId)
  if (!connection) notFound()

  let listing: Awaited<ReturnType<typeof listBucket>> | null = null
  let tree: ExplorerFolder[] = []
  try {
    listing = await listBucket(currentTenant.id, connectionId, prefix, cursor)
    const parts = prefix.split("/").filter(Boolean)
    const levels = await Promise.all(Array.from({ length: parts.length + 1 }, (_, index) =>
      index === parts.length && !cursor ? Promise.resolve(listing!) : listBucket(currentTenant.id, connectionId, index ? `${parts.slice(0, index).join("/")}/` : "")
    ))
    tree = levels.flatMap((level, depth) => level.folders.map((folder) => ({ ...folder, depth })))
  } catch (error) { console.error("Bucket listing failed", error) }

  return <main className="flex h-svh min-h-0 w-full flex-col overflow-hidden bg-muted/30"><div className="shrink-0"><AppHeader user={user} /></div><section className="flex min-h-0 w-full flex-1 flex-col gap-3 px-3 py-3 sm:px-4">
    <div className="shrink-0"><div className="flex min-w-0 items-center gap-1"><Link href="/media" aria-label="Back to media" title="Back to media" className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-2" })}><HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} /></Link><h1 className="min-w-0 truncate text-xl font-semibold tracking-tight">{connection.name}</h1></div><p className="truncate text-xs text-muted-foreground">{connection.bucket} · {connection.region}{connection.endpoint ? ` · ${connection.endpoint}` : ""}</p></div>
    {listing ? <FileExplorer connectionId={connectionId} prefix={prefix} listing={listing} tree={tree} /> : <p className="rounded-xl border border-destructive/30 bg-card p-6 text-sm text-destructive">Unable to list this bucket. Check that the connection has permission to list objects.</p>}
  </section></main>
}
