import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Media, Page, Website } from "../lib/models";

async function main() {
if (!process.env.MONGODB_URI) { console.error("MONGODB_URI is required"); process.exit(1); }
const overwrite = process.argv.includes("--overwrite");
const uploadMedia = process.argv.includes("--upload-media");
const source = process.env.UNIFATO_PROJECT_PATH || "C:/Users/ForteStore/Documents/GitHub/website-unifato";
const dataPath = path.join(source, "src/data/site.ts");
const data = await import(pathToFileURL(dataPath).href);
await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || undefined });
let site = await Website.findOne({ slug: "unifato" });
let settings = { nav: data.nav, timeline: data.timeline, storeGroups: data.storeGroups, news: data.news, clipping: data.clipping, brandLogos: data.brandLogos, customerBenefits: data.customerBenefits, privacySections: data.privacySections, contactEmail: data.contactEmail };
let importedRoutes = data.routes as Record<"PT"|"EN", Array<Record<string, unknown>>>;
const mediaMap = new Map<string, string>();
if (uploadMedia) {
  const bucket = process.env.S3_BUCKET, publicBase = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicBase) throw new Error("--upload-media requires S3_BUCKET and S3_PUBLIC_URL (plus provider credentials when required)");
  const client = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } : undefined });
  const root = path.join(source, "public/assets"); const files: string[] = [];
  const walk = async (directory: string) => { for (const entry of await readdir(directory)) { const full = path.join(directory, entry); if ((await stat(full)).isDirectory()) await walk(full); else files.push(full); } };
  await walk(root);
  const types: Record<string,string> = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".gif":"image/gif", ".svg":"image/svg+xml", ".pdf":"application/pdf" };
  for (const file of files) { const relative = path.relative(root, file).replaceAll("\\", "/"); const key = `unifato/imported/${relative}`; const contentType = types[path.extname(file).toLowerCase()]; if (!contentType) continue; const body = await readFile(file); const existing = await Media.findOne({ key }); if (!existing || overwrite) { await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" })); const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); if (head.ContentLength !== body.length) throw new Error(`Verification failed for ${relative}`); } const url = `${publicBase.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`; mediaMap.set(`/assets/${relative}`, url); }
}
const replaceMedia = (value: unknown): unknown => typeof value === "string" ? (mediaMap.get(value) || value) : Array.isArray(value) ? value.map(replaceMedia) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceMedia(child)])) : value;
if (mediaMap.size) { settings = replaceMedia(settings) as typeof settings; importedRoutes = replaceMedia(importedRoutes) as typeof importedRoutes; }
if (!site) site = await Website.create({ name: "Grupo Unifato", slug: "unifato", publicUrl: "https://unifato.pt", type: "unifato-v1", settingsDraft: settings, settingsPublished: settings, settingsPublishedAt: new Date() });
else if (overwrite) { site.settingsDraft = settings; site.settingsPublished = settings; site.settingsPublishedAt = new Date(); await site.save(); }
let created = 0, skipped = 0;
if (mediaMap.size) for (const [sourceUrl, publicUrl] of mediaMap) { const relative = sourceUrl.slice(8); const file = path.join(source, "public/assets", relative); const info = await stat(file); const types: Record<string,string> = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".gif":"image/gif", ".svg":"image/svg+xml", ".pdf":"application/pdf" }; await Media.findOneAndUpdate({ key: `unifato/imported/${relative}` }, { $setOnInsert: { websiteId: site._id }, $set: { filename: path.basename(relative), contentType: types[path.extname(relative).toLowerCase()], size: info.size, visibility: "public", status: "ready", publicUrl } }, { upsert: true }); }
for (const locale of ["PT", "EN"] as const) for (const route of importedRoutes[locale]) {
  const existing = await Page.findOne({ websiteId: site._id, slug: route.slug });
  if (existing && !overwrite) { skipped++; continue; }
  await Page.findOneAndUpdate({ websiteId: site._id, slug: route.slug }, { $set: { websiteId: site._id, slug: route.slug, title: route.title, locale, kind: route.kind, draft: route, published: route, seoDraft: { title: route.title, description: `${route.title} — Grupo Unifato`, socialImage: route.hero || "" }, seoPublished: { title: route.title, description: `${route.title} — Grupo Unifato`, socialImage: route.hero || "" }, publishedAt: new Date() } }, { upsert: true }); created++;
}
console.log(`Unifato import complete: ${created} written, ${skipped} preserved. Website ID: ${site._id}`);
if (!uploadMedia) console.log("Existing static assets were left in Astro. Add --upload-media with S3 configuration to import them and rewrite CMS asset URLs.");
await mongoose.disconnect();
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
