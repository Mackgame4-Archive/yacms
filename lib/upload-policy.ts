import { randomToken } from "./security";

export const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf"]);
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export function validateUpload(file: { size: number; type: string }) { if (!ALLOWED_MEDIA_TYPES.has(file.type)) throw new Error("Unsupported file type"); if (file.size < 1 || file.size > MAX_MEDIA_BYTES) throw new Error("Files must be between 1 byte and 10 MB"); }
export function createObjectKey(websiteSlug: string, filename: string) { const ext = filename.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] || ""; return `${websiteSlug}/${new Date().getUTCFullYear()}/${randomToken(18)}${ext}`; }
