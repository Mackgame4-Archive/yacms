import { apiError, authenticatePublishedRead, json } from "@/lib/api-auth";
import { Page } from "@/lib/models";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await authenticatePublishedRead(request, slug);
  if (!site) return apiError("Unauthorized", 401);
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const locale = url.searchParams.get("locale");
  const filter = { websiteId: site._id, publishedAt: { $ne: null }, ...(locale ? { locale } : {}) };
  const [items, total] = await Promise.all([
    Page.find(filter).select("slug title locale kind published seoPublished publishedAt").sort({ locale: 1, slug: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Page.countDocuments(filter),
  ]);
  return json({ items: items.map(item => ({ slug: item.slug, title: item.title, locale: item.locale, kind: item.kind, content: item.published, seo: item.seoPublished, publishedAt: item.publishedAt })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
