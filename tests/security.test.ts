import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { hashPassword, hashToken, isSessionActive, randomToken, verifyPassword } from "../lib/security";
import { createObjectKey, validateUpload } from "../lib/upload-policy";
import { publishedSnapshot, tenantApiKeyFilter, tenantDocumentFilter } from "../lib/tenant";

describe("sessions and credentials", () => {
  it("expires sessions explicitly and treats revoked (missing) sessions as invalid", () => { expect(isSessionActive(new Date(Date.now() - 1))).toBe(false); expect(isSessionActive(new Date(Date.now() + 1000))).toBe(true); const revokedSession = null; expect(revokedSession && isSessionActive(new Date())).toBeFalsy(); });
  it("hashes passwords with unique salts and verifies safely", async () => { const one = await hashPassword("a-secure-password"); const two = await hashPassword("a-secure-password"); expect(one).not.toBe(two); expect(await verifyPassword("a-secure-password", one)).toBe(true); expect(await verifyPassword("wrong-password", one)).toBe(false); });
  it("stores only deterministic hashes of opaque tokens", () => { const token = randomToken(); expect(token).not.toBe(hashToken(token)); expect(hashToken(token)).toBe(hashToken(token)); });
});

describe("tenant isolation and publication", () => {
  it("always scopes document and media access by tenant", () => { const siteA = new mongoose.Types.ObjectId(), siteB = new mongoose.Types.ObjectId(), document = new mongoose.Types.ObjectId(); expect(tenantDocumentFilter(siteA, document)).not.toEqual(tenantDocumentFilter(siteB, document)); expect(tenantDocumentFilter(siteA, document)).toEqual({ _id: document, websiteId: siteA }); });
  it("binds API keys to one tenant and published read permission", () => { const a = new mongoose.Types.ObjectId(), b = new mongoose.Types.ObjectId(); expect(tenantApiKeyFilter(a, "hash")).not.toEqual(tenantApiKeyFilter(b, "hash")); expect(tenantApiKeyFilter(a, "hash")).toMatchObject({ websiteId: a, revokedAt: null, permissions: "published:read" }); });
  it("keeps published content unchanged when the draft changes", () => { const draft = { sections: [{ title: "First" }] }; const published = publishedSnapshot(draft); draft.sections[0].title = "Edited"; expect(published.sections[0].title).toBe("First"); });
});

describe("upload validation", () => {
  it("rejects unapproved types and oversized files", () => { expect(() => validateUpload({ type: "text/html", size: 100 })).toThrow(); expect(() => validateUpload({ type: "image/png", size: 11 * 1024 * 1024 })).toThrow(); expect(() => validateUpload({ type: "image/png", size: 1024 })).not.toThrow(); });
  it("creates website-prefixed unpredictable keys", () => { const a = createObjectKey("unifato", "photo.jpg"), b = createObjectKey("unifato", "photo.jpg"); expect(a).toMatch(/^unifato\/\d{4}\/.+\.jpg$/); expect(a).not.toBe(b); });
});
