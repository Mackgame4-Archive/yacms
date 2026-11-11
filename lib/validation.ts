import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(256) });
export const websiteSchema = z.object({ name: z.string().min(2).max(100), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), publicUrl: z.string().url(), type: z.string().min(1).max(50).default("structured") });
export const pageSchema = z.object({ websiteId: z.string(), pageId: z.string().optional(), slug: z.string().min(1).max(180), title: z.string().min(1).max(200), locale: z.string().min(2).max(10), kind: z.string().min(1).max(50), content: z.string().max(500_000), seoTitle: z.string().max(200).optional(), seoDescription: z.string().max(500).optional(), socialImage: z.string().max(2048).optional() });
export const settingsSchema = z.object({ websiteId: z.string(), content: z.string().max(500_000) });
export const apiKeySchema = z.object({ websiteId: z.string(), name: z.string().min(2).max(100) });
export const membershipSchema = z.object({ websiteId: z.string(), email: z.string().email(), role: z.enum(["administrator", "editor"]) });

export function parseJsonObject(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Content must be a JSON object");
  return parsed as Record<string, unknown>;
}
