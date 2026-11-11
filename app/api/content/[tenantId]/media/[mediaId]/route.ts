import { mediaUrl } from "@/lib/media"

export async function GET(_request: Request, context: RouteContext<"/api/content/[tenantId]/media/[mediaId]">) {
  const { tenantId, mediaId } = await context.params
  const url = await mediaUrl(tenantId, mediaId)
  if (!url) return new Response("Not found", { status: 404 })
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } })
}
