"use server"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { getTenantContext } from "@/lib/tenant-context"
import { createBucketFolder, deleteBucketFile, deleteEmptyBucketFolder, pasteBucketFile, renameBucketFile, uploadBucketFile, validPrefix } from "@/lib/bucket-explorer"

export type BucketState = { error?: string; success?: string }
const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim()

async function context(data: FormData) {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  const connectionId = field(data, "connectionId")
  const prefix = field(data, "prefix")
  if (!currentTenant || !validPrefix(prefix)) throw new Error("Invalid connection or folder")
  return { tenantId: currentTenant.id, connectionId, prefix }
}

async function perform(data: FormData, operation: (scope: Awaited<ReturnType<typeof context>>) => Promise<void>, success: string): Promise<BucketState> {
  try {
    const scope = await context(data)
    await operation(scope)
    revalidatePath(`/media/${scope.connectionId}`)
    revalidatePath("/media")
    return { success }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Storage operation failed." }
  }
}

export async function createFolderAction(_state: BucketState, data: FormData) {
  return perform(data, ({ tenantId, connectionId, prefix }) => createBucketFolder(tenantId, connectionId, prefix, field(data, "name")), "Folder created.")
}

export async function uploadBucketAction(_state: BucketState, data: FormData) {
  const file = data.get("file")
  if (!(file instanceof File)) return { error: "Choose a file." }
  return perform(data, ({ tenantId, connectionId, prefix }) => uploadBucketFile(tenantId, connectionId, prefix, file), "File uploaded.")
}

export async function renameBucketFileAction(_state: BucketState, data: FormData) {
  return perform(data, ({ tenantId, connectionId, prefix }) => renameBucketFile(tenantId, connectionId, prefix, field(data, "key"), field(data, "name")), "File renamed.")
}

export async function deleteBucketFileAction(_state: BucketState, data: FormData) {
  return perform(data, ({ tenantId, connectionId, prefix }) => deleteBucketFile(tenantId, connectionId, prefix, field(data, "key")), "File deleted.")
}

export async function deleteBucketFolderAction(_state: BucketState, data: FormData) {
  return perform(data, ({ tenantId, connectionId, prefix }) => deleteEmptyBucketFolder(tenantId, connectionId, prefix, field(data, "folder")), "Empty folder deleted.")
}

export async function pasteBucketFileAction(data: FormData) {
  return perform(data, ({ tenantId, connectionId, prefix }) => pasteBucketFile(tenantId, connectionId, field(data, "key"), prefix, field(data, "mode") === "cut"), "File pasted.")
}
