"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectDatabase } from "@/lib/db";
import { ApiKey, LoginAttempt, Media, Page, User, Website, WebsiteMembership, objectId } from "@/lib/models";
import { apiKeySchema, loginSchema, membershipSchema, pageSchema, parseJsonObject, settingsSchema, websiteSchema } from "@/lib/validation";
import { assertSameOrigin, authorizeWebsite, createSession, requireViewer, revokeCurrentSession } from "@/lib/auth";
import { hashPassword, hashToken, randomToken, verifyPassword } from "@/lib/security";
import { createObjectKey, deleteObject, publicAssetUrl, uploadObject, validateUpload } from "@/lib/storage";
import { publishedSnapshot, tenantDocumentFilter } from "@/lib/tenant";
import { validatePageContent, validateSettingsContent } from "@/lib/content-schema";

export type ActionState = { error?: string; success?: string; secret?: string };
const fail = (error: unknown): ActionState => ({ error: error instanceof Error ? error.message : "Something went wrong" });
const DEVELOPMENT_ADMIN = { email: "admin@localhost.test", password: "admin-local-2026", name: "Local Administrator" } as const;

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const input = loginSchema.parse(Object.fromEntries(formData));
    await connectDatabase();
    const key = hashToken(input.email);
    const limit = await LoginAttempt.findOne({ key }).lean();
    if (limit?.blockedUntil && limit.blockedUntil > new Date()) return { error: "Invalid email or password." };
    if (process.env.NODE_ENV !== "production" && input.email === DEVELOPMENT_ADMIN.email && input.password === DEVELOPMENT_ADMIN.password) {
      const passwordHash = await hashPassword(DEVELOPMENT_ADMIN.password);
      await User.findOneAndUpdate({ email: DEVELOPMENT_ADMIN.email }, { $setOnInsert: { name: DEVELOPMENT_ADMIN.name, passwordHash, isPlatformAdmin: true, passwordChangedAt: new Date() } }, { upsert: true });
    }
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : await verifyPassword(input.password, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA").catch(() => false);
    if (!user || !valid) {
      const failures = (limit?.failures || 0) + 1;
      await LoginAttempt.findOneAndUpdate({ key }, { $set: { failures, blockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60_000) : null, expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } }, { upsert: true });
      return { error: "Invalid email or password." };
    }
    await LoginAttempt.deleteOne({ key });
    await createSession(String(user._id));
  } catch { return { error: "Invalid email or password." }; }
  redirect("/admin");
}

export async function logoutAction() { await assertSameOrigin(); await revokeCurrentSession(); redirect("/login"); }

export async function createWebsiteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try { await assertSameOrigin(); const viewer = await requireViewer(); if (!viewer.isPlatformAdmin) throw new Error("Forbidden"); const input = websiteSchema.parse(Object.fromEntries(formData)); await connectDatabase(); const site = await Website.create({ ...input, settingsDraft: {} }); revalidatePath("/admin"); return { success: String(site._id) }; } catch (e) { return fail(e); }
}

export async function savePageAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try { await assertSameOrigin(); const input = pageSchema.parse(Object.fromEntries(formData)); const access = await authorizeWebsite(input.websiteId); const site = await Website.findById(access.websiteId).select("type").lean(); if (!site) throw new Error("Website not found"); const content = validatePageContent(site.type, parseJsonObject(input.content)); const seoDraft = { title: input.seoTitle || "", description: input.seoDescription || "", socialImage: input.socialImage || "" }; const filter = input.pageId ? { _id: objectId(input.pageId), websiteId: access.websiteId } : { websiteId: access.websiteId, slug: input.slug }; const page = await Page.findOneAndUpdate(filter, { $set: { websiteId: access.websiteId, slug: input.slug, title: input.title, locale: input.locale, kind: input.kind, draft: content, seoDraft } }, { upsert: !input.pageId, new: true, runValidators: true }); if (!page) throw new Error("Page not found in this website"); revalidatePath(`/admin/websites/${input.websiteId}/pages`); return { success: "Draft saved" }; } catch (e) { return fail(e); }
}

export async function publicationAction(formData: FormData) { await assertSameOrigin(); const websiteId = String(formData.get("websiteId")); const pageId = String(formData.get("pageId")); const mode = String(formData.get("mode")); const access = await authorizeWebsite(websiteId); const page = await Page.findOne(tenantDocumentFilter(access.websiteId, objectId(pageId))); if (!page) throw new Error("Page not found in this website"); if (mode === "publish") { page.published = publishedSnapshot(page.draft); page.seoPublished = publishedSnapshot(page.seoDraft); page.publishedAt = new Date(); } else { page.published = null; page.seoPublished = null; page.publishedAt = null; } await page.save(); revalidatePath(`/admin/websites/${websiteId}/pages`); }

export async function saveSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> { try { await assertSameOrigin(); const input = settingsSchema.parse(Object.fromEntries(formData)); const access = await authorizeWebsite(input.websiteId); const site = await Website.findById(access.websiteId).select("type").lean(); if (!site) throw new Error("Website not found"); const settingsDraft = validateSettingsContent(site.type, parseJsonObject(input.content)); await Website.updateOne({ _id: access.websiteId }, { $set: { settingsDraft } }); return { success: "Settings draft saved" }; } catch (e) { return fail(e); } }
export async function publishSettingsAction(formData: FormData) { await assertSameOrigin(); const websiteId = String(formData.get("websiteId")); const access = await authorizeWebsite(websiteId); const site = await Website.findById(access.websiteId); if (!site) throw new Error("Website not found"); site.settingsPublished = structuredClone(site.settingsDraft); site.settingsPublishedAt = new Date(); await site.save(); revalidatePath(`/admin/websites/${websiteId}/settings`); }

export async function createApiKeyAction(_: ActionState, formData: FormData): Promise<ActionState> { try { await assertSameOrigin(); const input = apiKeySchema.parse(Object.fromEntries(formData)); const access = await authorizeWebsite(input.websiteId, "administrator"); const secret = `fcms_${randomToken(32)}`; await ApiKey.create({ websiteId: access.websiteId, name: input.name, prefix: secret.slice(0, 13), keyHash: hashToken(secret) }); revalidatePath(`/admin/websites/${input.websiteId}/api-keys`); return { success: "Key created. Copy it now; it will not be shown again.", secret }; } catch (e) { return fail(e); } }
export async function revokeApiKeyAction(formData: FormData) { await assertSameOrigin(); const websiteId = String(formData.get("websiteId")); const access = await authorizeWebsite(websiteId, "administrator"); await ApiKey.updateOne({ _id: objectId(String(formData.get("keyId"))), websiteId: access.websiteId }, { $set: { revokedAt: new Date() } }); revalidatePath(`/admin/websites/${websiteId}/api-keys`); }

export async function addMembershipAction(_: ActionState, formData: FormData): Promise<ActionState> { try { await assertSameOrigin(); const input = membershipSchema.parse(Object.fromEntries(formData)); const access = await authorizeWebsite(input.websiteId, "administrator"); const user = await User.findOne({ email: input.email.toLowerCase() }); if (!user) throw new Error("No user exists with that email"); await WebsiteMembership.findOneAndUpdate({ websiteId: access.websiteId, userId: user._id }, { $set: { role: input.role } }, { upsert: true }); revalidatePath(`/admin/websites/${input.websiteId}/members`); return { success: "Membership saved" }; } catch (e) { return fail(e); } }

export async function uploadMediaAction(_: ActionState, formData: FormData): Promise<ActionState> { try { await assertSameOrigin(); const websiteId = String(formData.get("websiteId")); const visibility = formData.get("visibility") === "private" ? "private" : "public"; const file = formData.get("file"); if (!(file instanceof File)) throw new Error("Choose a file"); validateUpload(file); const access = await authorizeWebsite(websiteId); const site = await Website.findById(access.websiteId).select("slug").lean(); if (!site) throw new Error("Website not found"); const key = createObjectKey(site.slug, file.name); const media = await Media.create({ websiteId: access.websiteId, key, filename: file.name, contentType: file.type, size: file.size, visibility, status: "pending", publicUrl: visibility === "public" ? publicAssetUrl(key) : null }); try { await uploadObject(key, file, visibility); media.status = "ready"; await media.save(); } catch (e) { await Media.deleteOne({ _id: media._id }); throw e; } revalidatePath(`/admin/websites/${websiteId}/media`); return { success: "Upload complete" }; } catch (e) { return fail(e); } }
export async function deleteMediaAction(formData: FormData) { await assertSameOrigin(); const websiteId = String(formData.get("websiteId")); const access = await authorizeWebsite(websiteId); const media = await Media.findOne(tenantDocumentFilter(access.websiteId, objectId(String(formData.get("mediaId"))))); if (!media) throw new Error("Media not found in this website"); await deleteObject(media.key); await media.deleteOne(); revalidatePath(`/admin/websites/${websiteId}/media`); }
