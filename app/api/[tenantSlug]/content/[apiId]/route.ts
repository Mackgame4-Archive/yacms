import { listContentEntries } from "@/lib/content-entries"
import { findContentTypeByApiId } from "@/lib/content-types"
import { mediaIdsExist } from "@/lib/media"
import { isLocalMediaPath } from "@/lib/media-path"
import { authenticateContentApi } from "@/lib/tenant-api-token"

export async function GET(
  request: Request,
  context: RouteContext<"/api/[tenantSlug]/content/[apiId]">
) {
  const { tenantSlug, apiId } = await context.params
  const tenantId = await authenticateContentApi(tenantSlug, request.headers.get("authorization"))
  if (!tenantId) {
    return Response.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } })
  }

  const contentType = await findContentTypeByApiId(tenantId, apiId)
  if (!contentType) {
    return Response.json({ error: "Content type not found." }, { status: 404 })
  }

  const entries = await listContentEntries({
    tenantId,
    contentTypeId: contentType.id,
    publishedOnly: true,
  })

  const data = await Promise.all(entries.map(async (entry) => {
    const values = { ...entry.values }
    for (const field of contentType.fields.filter((item) => item.type === "media")) {
      const selected = values[field.apiId]
      values[field.apiId] = Array.isArray(selected)
        ? await Promise.all(selected.map((id) => mediaReferenceUrl(tenantId, tenantSlug, String(id), request.url)))
        : typeof selected === "string" ? await mediaReferenceUrl(tenantId, tenantSlug, selected, request.url) : null
    }
    return { id: entry.id, ...values, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString() }
  }))

  return Response.json(
    {
      type: {
        name: contentType.name,
        apiId: contentType.apiId,
        fields: contentType.fields.map((field) => ({
          name: field.name,
          apiId: field.apiId,
          type: field.type,
          multiple: field.multiple,
          relatedContentTypeId: field.relatedContentTypeId,
        })),
      },
      data,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

async function mediaReferenceUrl(tenantId: string, tenantSlug: string, mediaId: string, requestUrl: string) {
  if (mediaId.startsWith("/")) return isLocalMediaPath(mediaId) ? mediaId : null
  if (!(await mediaIdsExist(tenantId, [mediaId]))) return null
  return new URL(`/api/${encodeURIComponent(tenantSlug)}/media/${mediaId}`, requestUrl).toString()
}
