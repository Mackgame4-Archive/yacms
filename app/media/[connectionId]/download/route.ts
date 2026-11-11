import { requireUser } from "@/lib/auth"
import { getTenantContext } from "@/lib/tenant-context"
import { bucketDownloadUrl } from "@/lib/bucket-explorer"

export async function GET(request: Request, context: RouteContext<"/media/[connectionId]/download">) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return new Response("Not found", { status: 404 })
  const { connectionId } = await context.params
  const key = new URL(request.url).searchParams.get("key")
  if (!key) return new Response("Not found", { status: 404 })
  try {
    const url = await bucketDownloadUrl(currentTenant.id, connectionId, key)
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } })
  } catch { return new Response("Not found", { status: 404 }) }
}
