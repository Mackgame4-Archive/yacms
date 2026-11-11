import { Types } from "mongoose"

import { listContentEntries } from "@/lib/content-entries"
import { findContentTypeByApiId } from "@/lib/content-types"
import { mediaIdsExist } from "@/lib/media"

export async function GET(
  request: Request,
  context: RouteContext<"/api/content/[tenantId]/[apiId]">
) {
  const { tenantId, apiId } = await context.params
  if (!Types.ObjectId.isValid(tenantId)) {
    return Response.json({ error: "Content source not found." }, { status: 404 })
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
        ? await Promise.all(selected.map((id) => mediaReferenceUrl(tenantId, String(id), request.url)))
        : typeof selected === "string" ? await mediaReferenceUrl(tenantId, selected, request.url) : null
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
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}

async function mediaReferenceUrl(tenantId: string, mediaId: string, requestUrl: string) {
  if (!(await mediaIdsExist(tenantId, [mediaId]))) return null
  return new URL(`/api/content/${tenantId}/media/${mediaId}`, requestUrl).toString()
}
