import "server-only";
import { connectDatabase } from "./db";
import { ApiKey, Website } from "./models";
import { hashToken } from "./security";
import { tenantApiKeyFilter } from "./tenant";

export async function authenticatePublishedRead(request: Request, websiteSlug: string) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  if (!token.startsWith("fcms_") || token.length > 100) return null;
  await connectDatabase();
  const site = await Website.findOne({ slug: websiteSlug }).select("name slug publicUrl settingsPublished settingsPublishedAt").lean();
  if (!site) return null;
  const key = await ApiKey.findOne(tenantApiKeyFilter(site._id, hashToken(token))).select("+keyHash");
  if (!key) return null;
  key.lastUsedAt = new Date();
  await key.save();
  return site;
}

export const apiHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization", "X-Content-Type-Options": "nosniff" };
export function json(data: unknown, status = 200) { return Response.json({ data }, { status, headers: apiHeaders }); }
export function apiError(error: string, status: number) { return Response.json({ error: { code: status, message: error } }, { status, headers: apiHeaders }); }
