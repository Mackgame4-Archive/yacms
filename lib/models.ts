import mongoose, { Schema, model, models } from "mongoose";

const timestamps = { timestamps: true } as const;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  isPlatformAdmin: { type: Boolean, default: false },
  passwordChangedAt: { type: Date, default: Date.now },
}, timestamps);

const SessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, timestamps);

const WebsiteSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  publicUrl: { type: String, required: true },
  type: { type: String, required: true, default: "structured" },
  settingsDraft: { type: Schema.Types.Mixed, required: true, default: {} },
  settingsPublished: { type: Schema.Types.Mixed, default: null },
  settingsPublishedAt: { type: Date, default: null },
}, timestamps);

const MembershipSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  websiteId: { type: Schema.Types.ObjectId, ref: "Website", required: true },
  role: { type: String, enum: ["administrator", "editor"], required: true },
}, timestamps);
MembershipSchema.index({ userId: 1, websiteId: 1 }, { unique: true });

const PageSchema = new Schema({
  websiteId: { type: Schema.Types.ObjectId, ref: "Website", required: true, index: true },
  slug: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  locale: { type: String, required: true, default: "PT" },
  kind: { type: String, required: true, default: "page" },
  draft: { type: Schema.Types.Mixed, required: true, default: {} },
  published: { type: Schema.Types.Mixed, default: null },
  seoDraft: { type: Schema.Types.Mixed, default: {} },
  seoPublished: { type: Schema.Types.Mixed, default: null },
  publishedAt: { type: Date, default: null },
}, timestamps);
PageSchema.index({ websiteId: 1, slug: 1 }, { unique: true });
PageSchema.index({ websiteId: 1, locale: 1, publishedAt: -1 });

const MediaSchema = new Schema({
  websiteId: { type: Schema.Types.ObjectId, ref: "Website", required: true, index: true },
  key: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  visibility: { type: String, enum: ["public", "private"], required: true },
  status: { type: String, enum: ["pending", "ready"], default: "pending" },
  publicUrl: { type: String, default: null },
}, timestamps);
MediaSchema.index({ websiteId: 1, createdAt: -1 });

const ApiKeySchema = new Schema({
  websiteId: { type: Schema.Types.ObjectId, ref: "Website", required: true, index: true },
  name: { type: String, required: true },
  prefix: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true, select: false },
  permissions: { type: [String], default: ["published:read"] },
  lastUsedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
}, timestamps);

const LoginAttemptSchema = new Schema({
  key: { type: String, required: true, unique: true },
  failures: { type: Number, default: 0 },
  blockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, timestamps);

export const User = models.User || model("User", UserSchema);
export const Session = models.Session || model("Session", SessionSchema);
export const Website = models.Website || model("Website", WebsiteSchema);
export const WebsiteMembership = models.WebsiteMembership || model("WebsiteMembership", MembershipSchema);
export const Page = models.Page || model("Page", PageSchema);
export const Media = models.Media || model("Media", MediaSchema);
export const ApiKey = models.ApiKey || model("ApiKey", ApiKeySchema);
export const LoginAttempt = models.LoginAttempt || model("LoginAttempt", LoginAttemptSchema);

export function objectId(value: string) {
  if (!mongoose.isValidObjectId(value)) throw new Error("Invalid identifier");
  return new mongoose.Types.ObjectId(value);
}
