import { Types } from "mongoose"

import { listContentEntries } from "@/lib/content-entries"
import { findContentTypeByApiId } from "@/lib/content-types"

export async function GET(
  _request: Request,
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
      data: entries.map((entry) => ({
        id: entry.id,
        ...entry.values,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  )
}
