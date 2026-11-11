import { apiError, authenticatePublishedRead, json } from "@/lib/api-auth";
import { Page } from "@/lib/models";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; pageSlug: string }> }) {
  const { slug, pageSlug } = await params;
  const site = await authenticatePublishedRead(request, slug);
  if (!site) return apiError("Unauthorized", 401);
  const page = await Page.findOne({ websiteId: site._id, slug: pageSlug, publishedAt: { $ne: null } }).select("slug title locale kind published seoPublished publishedAt").lean();
  if (!page) return apiError("Page not found", 404);
  return json({ slug: page.slug, title: page.title, locale: page.locale, kind: page.kind, content: page.published, seo: page.seoPublished, publishedAt: page.publishedAt });
}
