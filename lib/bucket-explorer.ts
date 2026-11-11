import "server-only"
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/mongodb"
import { ContentEntryModel } from "@/lib/models/content-entry"
import { MediaAssetModel } from "@/lib/models/media-asset"
import { StorageConnectionModel } from "@/lib/models/storage-connection"
import { decryptStorageSecret } from "@/lib/media"

export function validPrefix(prefix: string) {
  return prefix.length <= 900 && (prefix === "" || (prefix.endsWith("/") && !prefix.startsWith("/") && !prefix.includes("//") && !prefix.split("/").includes("..")))
}

function validName(name: string) {
  return name.length > 0 && name.length <= 255 && name !== "." && name !== ".." && !/[\\/\x00-\x1f]/.test(name)
}

async function withBucket<T>(tenantId: string, connectionId: string, run: (s3: S3Client, bucket: string) => Promise<T>) {
  if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(connectionId)) throw new Error("Connection not found")
  await dbConnect()
  const connection = await StorageConnectionModel.findOne({ _id: new Types.ObjectId(connectionId), tenantId: new Types.ObjectId(tenantId) }).exec()
  if (!connection) throw new Error("Connection not found")
  const s3 = new S3Client({
    region: connection.region,
    endpoint: connection.endpoint || undefined,
    forcePathStyle: Boolean(connection.endpoint),
    credentials: { accessKeyId: connection.accessKeyId, secretAccessKey: decryptStorageSecret(connection.encryptedSecret) },
  })
  try { return await run(s3, connection.bucket) }
  finally { s3.destroy() }
}

async function objectExists(s3: S3Client, bucket: string, key: string) {
  try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true }
  catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    if (status === 404) return false
    throw error
  }
}

export async function listBucket(tenantId: string, connectionId: string, prefix: string, cursor?: string) {
  if (!validPrefix(prefix)) throw new Error("Invalid folder")
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: "/", MaxKeys: 100, ContinuationToken: cursor || undefined }))
    const keys = (result.Contents ?? []).filter((item) => item.Key && item.Key !== prefix).map((item) => ({
      key: item.Key!, name: item.Key!.slice(prefix.length), size: item.Size ?? 0, modified: item.LastModified?.toISOString() ?? "",
    }))
    const managed = await MediaAssetModel.find({ tenantId: new Types.ObjectId(tenantId), connectionId: new Types.ObjectId(connectionId), key: { $in: keys.map((item) => item.key) } }).select({ key: 1, _id: 1 }).lean().exec()
    const mediaIds = new Map(managed.map((item) => [item.key, item._id.toString()]))
    return {
      folders: (result.CommonPrefixes ?? []).flatMap((item) => item.Prefix ? [{ prefix: item.Prefix, name: item.Prefix.slice(prefix.length, -1) }] : []),
      files: keys.map((item) => ({ ...item, mediaId: mediaIds.get(item.key) ?? null })),
      nextCursor: result.NextContinuationToken ?? null,
    }
  })
}

export async function createBucketFolder(tenantId: string, connectionId: string, prefix: string, name: string) {
  if (!validPrefix(prefix) || !validName(name)) throw new Error("Invalid folder name")
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    const key = `${prefix}${name}/`
    if (await objectExists(s3, bucket, key)) throw new Error("Folder already exists")
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "" }))
  })
}

export async function uploadBucketFile(tenantId: string, connectionId: string, prefix: string, file: File) {
  if (!validPrefix(prefix) || !validName(file.name) || !file.size || file.size > 10 * 1024 * 1024) throw new Error("Invalid file")
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    const key = `${prefix}${file.name}`
    if (await objectExists(s3, bucket, key)) throw new Error("A file with that name already exists")
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type || "application/octet-stream" }))
    try {
      await MediaAssetModel.create({ tenantId: new Types.ObjectId(tenantId), connectionId: new Types.ObjectId(connectionId), key, filename: file.name, contentType: file.type || "application/octet-stream", size: file.size })
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      throw error
    }
  })
}

export async function renameBucketFile(tenantId: string, connectionId: string, prefix: string, key: string, name: string) {
  if (!validPrefix(prefix) || !validName(name) || !key.startsWith(prefix) || key.slice(prefix.length).includes("/") || key === prefix) throw new Error("Invalid file")
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    if (!(await objectExists(s3, bucket, key))) throw new Error("File not found")
    const nextKey = `${prefix}${name}`
    if (nextKey === key) return
    if (await objectExists(s3, bucket, nextKey)) throw new Error("A file with that name already exists")
    await s3.send(new CopyObjectCommand({ Bucket: bucket, Key: nextKey, CopySource: `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}` }))
    await MediaAssetModel.updateOne({ tenantId: new Types.ObjectId(tenantId), connectionId: new Types.ObjectId(connectionId), key }, { $set: { key: nextKey, filename: name } })
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  })
}

export async function pasteBucketFile(tenantId: string, connectionId: string, sourceKey: string, destinationPrefix: string, move: boolean) {
  if (!validPrefix(destinationPrefix) || !sourceKey || sourceKey.endsWith("/") || sourceKey.startsWith("/") || sourceKey.split("/").includes("..")) throw new Error("Invalid file")
  const name = sourceKey.split("/").at(-1) ?? ""
  if (!validName(name)) throw new Error("Invalid file")
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    if (!(await objectExists(s3, bucket, sourceKey))) throw new Error("Source file not found")
    const destinationKey = `${destinationPrefix}${name}`
    if (destinationKey === sourceKey) throw new Error("Choose another folder")
    if (await objectExists(s3, bucket, destinationKey)) throw new Error("A file with that name already exists in this folder")
    const sourceAsset = await MediaAssetModel.findOne({ tenantId: new Types.ObjectId(tenantId), connectionId: new Types.ObjectId(connectionId), key: sourceKey }).exec()
    await s3.send(new CopyObjectCommand({ Bucket: bucket, Key: destinationKey, CopySource: `${bucket}/${sourceKey.split("/").map(encodeURIComponent).join("/")}` }))
    try {
      if (sourceAsset) {
        if (move) await MediaAssetModel.updateOne({ _id: sourceAsset._id }, { $set: { key: destinationKey } })
        else await MediaAssetModel.create({ tenantId: new Types.ObjectId(tenantId), connectionId: new Types.ObjectId(connectionId), key: destinationKey, filename: sourceAsset.filename, contentType: sourceAsset.contentType, size: sourceAsset.size })
      }
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: destinationKey }))
      throw error
    }
    if (move) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: sourceKey }))
  })
}

export async function deleteBucketFile(tenantId: string, connectionId: string, prefix: string, key: string) {
  if (!validPrefix(prefix) || !key.startsWith(prefix) || key.slice(prefix.length).includes("/") || key === prefix) throw new Error("Invalid file")
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    const asset = await MediaAssetModel.findOne({ tenantId: new Types.ObjectId(tenantId), connectionId: new Types.ObjectId(connectionId), key }).exec()
    if (asset) {
      const entries = await ContentEntryModel.find({ tenantId: new Types.ObjectId(tenantId) }).select({ values: 1 }).lean().exec()
      if (entries.some((entry) => Object.values(entry.values ?? {}).some((value) => value === asset.id || (Array.isArray(value) && value.includes(asset.id))))) throw new Error("File is used by content")
    }
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    if (asset) await MediaAssetModel.deleteOne({ _id: asset._id, tenantId: new Types.ObjectId(tenantId) })
  })
}

export async function deleteEmptyBucketFolder(tenantId: string, connectionId: string, prefix: string, folder: string) {
  if (!validPrefix(prefix) || !folder.startsWith(prefix) || !validPrefix(folder) || folder.slice(prefix.length, -1).includes("/")) throw new Error("Invalid folder")
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: folder, MaxKeys: 2 }))
    if ((result.Contents ?? []).some((item) => item.Key !== folder) || result.IsTruncated) throw new Error("Folder is not empty")
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: folder }))
  })
}

export async function bucketDownloadUrl(tenantId: string, connectionId: string, key: string) {
  return withBucket(tenantId, connectionId, async (s3, bucket) => {
    if (!(await objectExists(s3, bucket, key))) throw new Error("File not found")
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 })
  })
}
