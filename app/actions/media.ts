"use server"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { getTenantContext } from "@/lib/tenant-context"
import { addConnection, removeConnection, removeMedia, uploadMedia } from "@/lib/media"

export type MediaActionState = { error?: string; success?: string }
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim()

export async function addConnectionAction(_state: MediaActionState, data: FormData): Promise<MediaActionState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return { error: "Select a website first." }
  const name = value(data, "name"), bucket = value(data, "bucket"), region = value(data, "region"), endpoint = value(data, "endpoint"), accessKeyId = value(data, "accessKeyId"), secretAccessKey = value(data, "secretAccessKey")
  if (!name || !bucket || !region || !accessKeyId || !secretAccessKey || name.length > 80) return { error: "Complete all required connection fields." }
  if (endpoint) {
    try { if (new URL(endpoint).protocol !== "https:") return { error: "Endpoint must use HTTPS." } }
    catch { return { error: "Endpoint must be a valid HTTPS URL." } }
  }
  try { await addConnection(currentTenant.id, { name, bucket, region, endpoint, accessKeyId, secretAccessKey }) }
  catch (error) { console.error("S3 connection failed", error); return { error: "Could not connect to the bucket. Check credentials, region, and bucket access." } }
  revalidatePath("/media")
  return { success: "Connection added." }
}

export async function uploadMediaAction(_state: MediaActionState, data: FormData): Promise<MediaActionState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return { error: "Select a website first." }
  const file = data.get("file")
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) return { error: "Choose a file up to 10 MB." }
  if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(file.type)) return { error: "Upload an image or PDF." }
  try { await uploadMedia(currentTenant.id, value(data, "connectionId"), file) }
  catch (error) { console.error("Media upload failed", error); return { error: "Upload failed. Check the S3 connection." } }
  revalidatePath("/media")
  return { success: "File uploaded." }
}

export async function removeConnectionAction(_state: MediaActionState, data: FormData): Promise<MediaActionState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return { error: "Select a website first." }
  const removed = await removeConnection(currentTenant.id, value(data, "connectionId"))
  if (!removed) return { error: "Remove files from this connection before deleting it." }
  revalidatePath("/media")
  return { success: "Connection removed." }
}

export async function removeMediaAction(_state: MediaActionState, data: FormData): Promise<MediaActionState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) return { error: "Select a website first." }
  try {
    if (!(await removeMedia(currentTenant.id, value(data, "mediaId")))) return { error: "File is used by content or could not be found." }
  } catch (error) { console.error("Media deletion failed", error); return { error: "Could not remove the file from S3." } }
  revalidatePath("/media")
  return { success: "File removed." }
}
