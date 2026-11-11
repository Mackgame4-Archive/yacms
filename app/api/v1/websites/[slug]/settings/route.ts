import { apiError, authenticatePublishedRead, json } from "@/lib/api-auth";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await authenticatePublishedRead(request, slug);
  if (!site) return apiError("Unauthorized", 401);
  if (!site.settingsPublished) return apiError("Published settings not found", 404);
  return json({ website: { name: site.name, slug: site.slug, publicUrl: site.publicUrl }, settings: site.settingsPublished, publishedAt: site.settingsPublishedAt });
}
