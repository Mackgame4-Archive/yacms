import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AppHeader } from "@/components/app-header"
import { ConnectionForm, RemoveConnectionForm, RemoveMediaForm, UploadForm } from "@/components/media-forms"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { getTenantContext } from "@/lib/tenant-context"
import { listConnections, listMedia } from "@/lib/media"

export const metadata = { title: "Media | YACMS" }

export default async function MediaPage() {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) redirect("/")
  const [connections, assets] = await Promise.all([listConnections(currentTenant.id), listMedia(currentTenant.id)])
  return <main className="min-h-svh bg-muted/30"><AppHeader user={user} /><section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
    <div className="mb-8"><div className="flex items-center gap-1"><Link href="/" aria-label="Back to dashboard" title="Back to dashboard" className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-2" })}><HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} /></Link><p className="text-sm font-medium text-muted-foreground">{currentTenant.name}</p></div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Media</h1><p className="mt-3 text-muted-foreground">Storage connections and files for {currentTenant.name}.</p></div>
    <div className="grid gap-6 lg:grid-cols-2"><ConnectionForm />{connections.length ? <UploadForm connections={connections} /> : <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Connect an S3 bucket to enable media uploads and media fields.</div>}</div>
    <h2 className="mt-10 mb-4 text-xl font-semibold">Connections</h2>
    <div className="grid gap-3">{connections.map((connection) => <div key={connection.id} className="rounded-xl border bg-card p-4"><Link href={`/media/${connection.id}`} className="font-semibold text-primary hover:underline">{connection.name}</Link><p className="text-sm text-muted-foreground">{connection.bucket} · {connection.region}{connection.endpoint ? ` · ${connection.endpoint}` : ""}</p><RemoveConnectionForm connectionId={connection.id} /></div>)}{!connections.length && <p className="text-sm text-muted-foreground">No S3 connection yet.</p>}</div>
    <h2 className="mt-10 mb-4 text-xl font-semibold">Upload history</h2>
    <div className="grid gap-3">{assets.map((asset) => <div key={asset.id} className="rounded-xl border bg-card p-4"><strong>{asset.filename}</strong><p className="text-sm text-muted-foreground">{asset.contentType} · {(asset.size / 1024).toFixed(1)} KB</p><RemoveMediaForm mediaId={asset.id} /></div>)}{!assets.length && <p className="text-sm text-muted-foreground">No files uploaded.</p>}</div>
  </section></main>
}
