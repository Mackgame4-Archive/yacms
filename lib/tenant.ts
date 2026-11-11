import mongoose from "mongoose";

export function tenantDocumentFilter(websiteId: mongoose.Types.ObjectId, documentId: mongoose.Types.ObjectId) {
  return { _id: documentId, websiteId };
}

export function tenantApiKeyFilter(websiteId: mongoose.Types.ObjectId, keyHash: string) {
  return { websiteId, keyHash, revokedAt: null, permissions: "published:read" };
}

export function publishedSnapshot<T>(draft: T): T { return structuredClone(draft); }
