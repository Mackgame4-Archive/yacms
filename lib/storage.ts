import "server-only";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { validateUpload } from "./upload-policy";
export { createObjectKey, validateUpload } from "./upload-policy";

function config() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is required");
  return { bucket, client: new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } : undefined }) };
}

export async function uploadObject(key: string, file: File, visibility: "public" | "private") {
  validateUpload(file);
  const { client, bucket } = config();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, CacheControl: visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store" }));
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (head.ContentLength !== file.size) throw new Error("Uploaded object verification failed");
}

export async function deleteObject(key: string) { const { client, bucket } = config(); await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); }
export function publicAssetUrl(key: string) { const base = process.env.S3_PUBLIC_URL; if (!base) return null; return `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`; }
