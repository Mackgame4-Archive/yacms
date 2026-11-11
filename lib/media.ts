import "server-only"
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto"
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Types } from "mongoose"
import { dbConnect } from "@/lib/mongodb"
import { StorageConnectionModel } from "@/lib/models/storage-connection"
import { MediaAssetModel } from "@/lib/models/media-asset"
import { ContentEntryModel } from "@/lib/models/content-entry"

function encryptionKey() {
  const encoded = process.env.MEDIA_ENCRYPTION_KEY
  const key = encoded && Buffer.from(encoded, "base64")
  if (!key) throw new Error("MEDIA_ENCRYPTION_KEY must be a base64-encoded 32-byte key")
  return key
}

function encrypt(secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".")
}

function decrypt(value: string) {
  const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"))
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

export function decryptStorageSecret(value: string) {
  return decrypt(value)
}

type ConnectionInput = { name: string; bucket: string; region: string; endpoint?: string; accessKeyId: string; secretAccessKey: string }

function client(input: { region: string; endpoint?: string; accessKeyId: string; secretAccessKey: string }) {
  return new S3Client({
    region: input.region,
    endpoint: input.endpoint || undefined,
    forcePathStyle: Boolean(input.endpoint),
    credentials: { accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey },
  })
}

function savedClient(connection: { region: string; endpoint?: string; accessKeyId: string; encryptedSecret: string }) {
  return client({ ...connection, secretAccessKey: decrypt(connection.encryptedSecret) })
}

export async function listConnections(tenantId: string) {
  await dbConnect()
  const records = await StorageConnectionModel.find({ tenantId: new Types.ObjectId(tenantId) }).sort({ createdAt: 1 }).exec()
  return records.map((record) => ({ id: record.id as string, name: record.name, bucket: record.bucket, region: record.region, endpoint: record.endpoint || "" }))
}

export async function addConnection(tenantId: string, input: ConnectionInput) {
  const s3 = client(input)
  try { await s3.send(new HeadBucketCommand({ Bucket: input.bucket })) }
  finally { s3.destroy() }
  await dbConnect()
  await StorageConnectionModel.create({ tenantId: new Types.ObjectId(tenantId), name: input.name, bucket: input.bucket, region: input.region, endpoint: input.endpoint, accessKeyId: input.accessKeyId, encryptedSecret: encrypt(input.secretAccessKey) })
}

export async function removeConnection(tenantId: string, connectionId: string) {
  if (!Types.ObjectId.isValid(connectionId)) return false
  await dbConnect()
  const filter = { tenantId: new Types.ObjectId(tenantId), connectionId: new Types.ObjectId(connectionId) }
  if (await MediaAssetModel.exists(filter)) return false
  const result = await StorageConnectionModel.deleteOne({ tenantId: filter.tenantId, _id: filter.connectionId })
  return result.deletedCount === 1
}

export async function listMedia(tenantId: string) {
  await dbConnect()
  const records = await MediaAssetModel.find({ tenantId: new Types.ObjectId(tenantId) }).sort({ createdAt: -1 }).exec()
  return records.map((record) => ({ id: record.id as string, filename: record.filename, contentType: record.contentType, size: record.size, connectionId: record.connectionId.toString() }))
}

export async function uploadMedia(tenantId: string, connectionId: string, file: File) {
  if (!Types.ObjectId.isValid(connectionId)) throw new Error("Invalid connection")
  await dbConnect()
  const connection = await StorageConnectionModel.findOne({ _id: new Types.ObjectId(connectionId), tenantId: new Types.ObjectId(tenantId) }).exec()
  if (!connection) throw new Error("Connection not found")
  const key = `tenants/${tenantId}/${randomUUID()}`
  const s3 = savedClient(connection)
  try {
    await s3.send(new PutObjectCommand({ Bucket: connection.bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type || "application/octet-stream" }))
    try {
      await MediaAssetModel.create({ tenantId: new Types.ObjectId(tenantId), connectionId: connection._id, key, filename: file.name, contentType: file.type || "application/octet-stream", size: file.size })
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: connection.bucket, Key: key }))
      throw error
    }
  } finally { s3.destroy() }
}

export async function mediaIdsExist(tenantId: string, ids: string[]) {
  if (ids.some((id) => !Types.ObjectId.isValid(id))) return false
  await dbConnect()
  return (await MediaAssetModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })) === new Set(ids).size
}

export async function removeMedia(tenantId: string, mediaId: string) {
  if (!Types.ObjectId.isValid(mediaId)) return false
  await dbConnect()
  const tenantObjectId = new Types.ObjectId(tenantId)
  const asset = await MediaAssetModel.findOne({ _id: new Types.ObjectId(mediaId), tenantId: tenantObjectId }).exec()
  if (!asset) return false
  const entries = await ContentEntryModel.find({ tenantId: tenantObjectId }).select({ values: 1 }).lean().exec()
  if (entries.some((entry) => Object.values(entry.values ?? {}).some((value) => value === mediaId || (Array.isArray(value) && value.includes(mediaId))))) return false
  const connection = await StorageConnectionModel.findOne({ _id: asset.connectionId, tenantId: tenantObjectId }).exec()
  if (!connection) return false
  const s3 = savedClient(connection)
  try { await s3.send(new DeleteObjectCommand({ Bucket: connection.bucket, Key: asset.key })) }
  finally { s3.destroy() }
  await MediaAssetModel.deleteOne({ _id: asset._id, tenantId: tenantObjectId })
  return true
}

export async function removeTenantMedia(tenantId: string) {
  await dbConnect()
  const tenantObjectId = new Types.ObjectId(tenantId)
  const assets = await MediaAssetModel.find({ tenantId: tenantObjectId }).exec()
  const connections = await StorageConnectionModel.find({ tenantId: tenantObjectId }).exec()
  for (const connection of connections) {
    const s3 = savedClient(connection)
    try {
      for (const asset of assets.filter((item) => item.connectionId.equals(connection._id))) {
        await s3.send(new DeleteObjectCommand({ Bucket: connection.bucket, Key: asset.key }))
      }
    } finally { s3.destroy() }
  }
  await MediaAssetModel.deleteMany({ tenantId: tenantObjectId })
  await StorageConnectionModel.deleteMany({ tenantId: tenantObjectId })
}

export async function mediaUrl(tenantId: string, mediaId: string) {
  if (!Types.ObjectId.isValid(mediaId)) return null
  await dbConnect()
  const asset = await MediaAssetModel.findOne({ _id: new Types.ObjectId(mediaId), tenantId: new Types.ObjectId(tenantId) }).exec()
  if (!asset) return null
  const connection = await StorageConnectionModel.findOne({ _id: asset.connectionId, tenantId: new Types.ObjectId(tenantId) }).exec()
  if (!connection) return null
  const s3 = savedClient(connection)
  try { return await getSignedUrl(s3, new GetObjectCommand({ Bucket: connection.bucket, Key: asset.key }), { expiresIn: 3600 }) }
  finally { s3.destroy() }
}
