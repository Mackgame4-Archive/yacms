import { createPublicFormSubmission } from "@/lib/forms"

const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/[tenantSlug]/forms/[apiId]">
) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(
      { error: "Content-Type must be application/json." },
      { status: 415, headers: corsHeaders }
    )
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    return Response.json(
      { error: "Request body is too large." },
      { status: 413, headers: corsHeaders }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "Request body must contain valid JSON." },
      { status: 400, headers: corsHeaders }
    )
  }

  const { tenantSlug, apiId } = await context.params
  let result: Awaited<ReturnType<typeof createPublicFormSubmission>>
  try {
    result = await createPublicFormSubmission({
      tenantSlug,
      formApiId: apiId,
      body,
    })
  } catch (error) {
    console.error("Form submission failed", error)
    return Response.json(
      { error: "Could not save the submission." },
      { status: 500, headers: corsHeaders }
    )
  }

  if (result.status === "not-found") {
    return Response.json(
      { error: "Form not found." },
      { status: 404, headers: corsHeaders }
    )
  }
  if (result.status === "invalid") {
    return Response.json(
      { error: "Invalid submission.", fields: result.fields },
      { status: 400, headers: corsHeaders }
    )
  }

  return Response.json(
    {
      data: {
        id: result.id,
        createdAt: result.createdAt.toISOString(),
      },
    },
    { status: 201, headers: corsHeaders }
  )
}
