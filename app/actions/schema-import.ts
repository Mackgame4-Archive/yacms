"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { importCmsSchema } from "@/lib/schema-import"
import { getTenantContext } from "@/lib/tenant-context"

export type SchemaImportState = {
  status?: "error" | "success"
  message?: string
}

export async function importSchemaAction(
  _state: SchemaImportState,
  formData: FormData
): Promise<SchemaImportState> {
  const user = await requireUser()
  const { currentTenant } = await getTenantContext(user.id)
  if (!currentTenant) {
    return { status: "error", message: "Select a website first." }
  }

  const file = formData.get("schemaFile")
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a JSON schema file." }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { status: "error", message: "The schema file must be 2 MB or smaller." }
  }
  if (!file.name.toLowerCase().endsWith(".json")) {
    return { status: "error", message: "The schema file must use the .json extension." }
  }

  try {
    const result = await importCmsSchema(currentTenant.id, await file.text())
    revalidatePath("/content-types")
    revalidatePath("/forms")
    revalidatePath("/settings")
    return {
      status: "success",
      message: `Imported ${result.contentTypes} content schema${result.contentTypes === 1 ? "" : "s"}, ${result.entries} seeded entr${result.entries === 1 ? "y" : "ies"}, and ${result.forms} form schema${result.forms === 1 ? "" : "s"}.`,
    }
  } catch (error) {
    console.error("CMS schema import failed", error)
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "The schema could not be imported.",
    }
  }
}
