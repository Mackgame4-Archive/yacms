import "server-only"

import { randomUUID } from "node:crypto"
import { Types } from "mongoose"

import { fieldTypes, type FieldType } from "@/lib/content-schema"
import {
  formFieldTypes,
  type FormFieldType,
} from "@/lib/form-schema"
import { dbConnect } from "@/lib/mongodb"
import { ContentEntryModel } from "@/lib/models/content-entry"
import { ContentTypeModel } from "@/lib/models/content-type"
import { FormSchemaModel } from "@/lib/models/form-schema"

type ImportedContentField = {
  name: string
  apiId: string
  type: Exclude<FieldType, "relation">
  required: boolean
  multiple: boolean
}

type ImportedContentEntry = {
  key: string
  status: "draft" | "published"
  values: Record<string, unknown>
}

type ImportedContentType = {
  name: string
  apiId: string
  description: string
  fields: ImportedContentField[]
  entries: ImportedContentEntry[]
}

type ImportedFormField = {
  name: string
  apiId: string
  type: FormFieldType
  required: boolean
}

type ImportedForm = {
  name: string
  apiId: string
  description: string
  fields: ImportedFormField[]
}

type CmsImportFile = {
  version: 1
  contentTypes: ImportedContentType[]
  forms: ImportedForm[]
}

export type CmsImportResult = {
  contentTypes: number
  entries: number
  forms: number
}

export async function importCmsSchema(
  tenantId: string,
  source: string
): Promise<CmsImportResult> {
  if (!Types.ObjectId.isValid(tenantId)) throw new Error("Invalid tenant.")
  const definition = parseCmsImportFile(source)
  const tenantObjectId = new Types.ObjectId(tenantId)

  await dbConnect()
  await Promise.all([
    ContentTypeModel.init(),
    ContentEntryModel.init(),
    FormSchemaModel.init(),
  ])

  for (const imported of definition.contentTypes) {
    let contentType = await ContentTypeModel.findOne({
      tenantId: tenantObjectId,
      apiId: imported.apiId,
    }).exec()

    if (!contentType) {
      contentType = await ContentTypeModel.create({
        tenantId: tenantObjectId,
        name: imported.name,
        apiId: imported.apiId,
        description: imported.description,
        fields: imported.fields.map((field) => ({
          id: randomUUID(),
          ...field,
        })),
      })
    } else {
      contentType.name = imported.name
      contentType.description = imported.description
      for (const importedField of imported.fields) {
        const field = contentType.fields.find(
          (item) => item.apiId === importedField.apiId
        )
        if (field) {
          field.name = importedField.name
          field.type = importedField.type
          field.required = importedField.required
          field.multiple = importedField.multiple
          field.relatedContentTypeId = undefined
        } else {
          contentType.fields.push({ id: randomUUID(), ...importedField })
        }
      }
      await contentType.save()
    }

    for (const entry of imported.entries) {
      await ContentEntryModel.findOneAndUpdate(
        {
          tenantId: tenantObjectId,
          contentTypeId: contentType._id,
          importKey: entry.key,
        },
        {
          $set: { values: entry.values, status: entry.status },
          $setOnInsert: {
            tenantId: tenantObjectId,
            contentTypeId: contentType._id,
            importKey: entry.key,
          },
        },
        { upsert: true, new: true, runValidators: true }
      ).exec()
    }
  }

  for (const imported of definition.forms) {
    let form = await FormSchemaModel.findOne({
      tenantId: tenantObjectId,
      apiId: imported.apiId,
    }).exec()

    if (!form) {
      form = await FormSchemaModel.create({
        tenantId: tenantObjectId,
        name: imported.name,
        apiId: imported.apiId,
        description: imported.description,
        fields: imported.fields.map((field) => ({
          id: randomUUID(),
          ...field,
        })),
      })
    } else {
      form.name = imported.name
      form.description = imported.description
      for (const importedField of imported.fields) {
        const field = form.fields.find(
          (item) => item.apiId === importedField.apiId
        )
        if (field) {
          field.name = importedField.name
          field.type = importedField.type
          field.required = importedField.required
        } else {
          form.fields.push({ id: randomUUID(), ...importedField })
        }
      }
      await form.save()
    }
  }

  return {
    contentTypes: definition.contentTypes.length,
    entries: definition.contentTypes.reduce(
      (total, contentType) => total + contentType.entries.length,
      0
    ),
    forms: definition.forms.length,
  }
}

function parseCmsImportFile(source: string): CmsImportFile {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new Error("The selected file does not contain valid JSON.")
  }
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("Unsupported CMS import file version.")
  }
  if (!Array.isArray(value.contentTypes) || !Array.isArray(value.forms)) {
    throw new Error("The file must contain contentTypes and forms arrays.")
  }
  if (value.contentTypes.length > 100 || value.forms.length > 100) {
    throw new Error("The import contains too many schemas.")
  }

  const contentTypes = value.contentTypes.map((item, index) =>
    parseContentType(item, index)
  )
  const forms = value.forms.map((item, index) => parseForm(item, index))
  assertUniqueApiIds(contentTypes, "content type")
  assertUniqueApiIds(forms, "form")
  return { version: 1, contentTypes, forms }
}

function parseContentType(value: unknown, index: number): ImportedContentType {
  const path = `contentTypes[${index}]`
  if (!isRecord(value)) throw new Error(`${path} must be an object.`)
  const name = requiredString(value.name, `${path}.name`, 80)
  const apiId = requiredApiId(value.apiId, `${path}.apiId`)
  const description = optionalString(value.description, `${path}.description`, 500)
  if (!Array.isArray(value.fields) || value.fields.length > 100) {
    throw new Error(`${path}.fields must be an array of at most 100 fields.`)
  }
  if (!Array.isArray(value.entries) || value.entries.length > 2_000) {
    throw new Error(`${path}.entries must be an array of at most 2,000 entries.`)
  }

  const fields = value.fields.map((field, fieldIndex) =>
    parseContentField(field, `${path}.fields[${fieldIndex}]`)
  )
  assertUniqueApiIds(fields, `${path} field`)
  const entries = value.entries.map((entry, entryIndex) =>
    parseContentEntry(entry, `${path}.entries[${entryIndex}]`, fields)
  )
  const keys = new Set<string>()
  for (const entry of entries) {
    if (keys.has(entry.key)) throw new Error(`${path} contains duplicate entry keys.`)
    keys.add(entry.key)
  }
  return { name, apiId, description, fields, entries }
}

function parseContentField(
  value: unknown,
  path: string
): ImportedContentField {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`)
  const requestedType = value.type
  if (
    typeof requestedType !== "string" ||
    !fieldTypes.includes(requestedType as FieldType) ||
    requestedType === "relation"
  ) {
    throw new Error(`${path}.type is not supported by schema imports.`)
  }
  return {
    name: requiredString(value.name, `${path}.name`, 80),
    apiId: requiredApiId(value.apiId, `${path}.apiId`),
    type: requestedType as Exclude<FieldType, "relation">,
    required: optionalBoolean(value.required, false, `${path}.required`),
    multiple: optionalBoolean(value.multiple, false, `${path}.multiple`),
  }
}

function parseContentEntry(
  value: unknown,
  path: string,
  fields: ImportedContentField[]
): ImportedContentEntry {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`)
  const key = requiredString(value.key, `${path}.key`, 120)
  const status = value.status ?? "published"
  if (status !== "draft" && status !== "published") {
    throw new Error(`${path}.status must be draft or published.`)
  }
  if (!isRecord(value.values)) throw new Error(`${path}.values must be an object.`)

  const knownFields = new Map(fields.map((field) => [field.apiId, field]))
  for (const apiId of Object.keys(value.values)) {
    if (!knownFields.has(apiId)) {
      throw new Error(`${path}.values.${apiId} is not defined in the schema.`)
    }
  }
  for (const field of fields) {
    const fieldValue = value.values[field.apiId]
    if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
      if (field.required) {
        throw new Error(`${path}.values.${field.apiId} is required.`)
      }
      continue
    }
    if (field.multiple) {
      if (!Array.isArray(fieldValue)) {
        throw new Error(`${path}.values.${field.apiId} must be an array.`)
      }
      for (const [itemIndex, item] of fieldValue.entries()) {
        validateContentValue(field, item, `${path}.values.${field.apiId}[${itemIndex}]`)
      }
    } else {
      validateContentValue(field, fieldValue, `${path}.values.${field.apiId}`)
    }
  }
  return { key, status, values: value.values }
}

function validateContentValue(
  field: ImportedContentField,
  value: unknown,
  path: string
) {
  if (field.type === "boolean") {
    if (typeof value !== "boolean") throw new Error(`${path} must be a boolean.`)
    return
  }
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${path} must be a number.`)
    }
    return
  }
  if (typeof value !== "string") throw new Error(`${path} must be text.`)
  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${path} must use YYYY-MM-DD.`)
  }
  if ((field.type === "url" || field.type === "media") && !isUrlOrPath(value)) {
    throw new Error(`${path} must be an HTTP URL or an absolute website path.`)
  }
}

function parseForm(value: unknown, index: number): ImportedForm {
  const path = `forms[${index}]`
  if (!isRecord(value)) throw new Error(`${path} must be an object.`)
  if (!Array.isArray(value.fields) || value.fields.length > 100) {
    throw new Error(`${path}.fields must be an array of at most 100 fields.`)
  }
  const fields = value.fields.map((field, fieldIndex) =>
    parseFormField(field, `${path}.fields[${fieldIndex}]`)
  )
  assertUniqueApiIds(fields, `${path} field`)
  return {
    name: requiredString(value.name, `${path}.name`, 80),
    apiId: requiredApiId(value.apiId, `${path}.apiId`),
    description: optionalString(value.description, `${path}.description`, 500),
    fields,
  }
}

function parseFormField(value: unknown, path: string): ImportedFormField {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`)
  if (
    typeof value.type !== "string" ||
    !formFieldTypes.includes(value.type as FormFieldType)
  ) {
    throw new Error(`${path}.type is invalid.`)
  }
  return {
    name: requiredString(value.name, `${path}.name`, 80),
    apiId: requiredApiId(value.apiId, `${path}.apiId`),
    type: value.type as FormFieldType,
    required: optionalBoolean(value.required, false, `${path}.required`),
  }
}

function assertUniqueApiIds(items: Array<{ apiId: string }>, label: string) {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.apiId)) throw new Error(`Duplicate ${label} API ID: ${item.apiId}.`)
    ids.add(item.apiId)
  }
}

function requiredString(value: unknown, path: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${path} must be 1–${maxLength} characters.`)
  }
  return value.trim()
}

function optionalString(value: unknown, path: string, maxLength: number) {
  if (value === undefined) return ""
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new Error(`${path} must be ${maxLength} characters or fewer.`)
  }
  return value.trim()
}

function requiredApiId(value: unknown, path: string) {
  if (
    typeof value !== "string" ||
    value.length < 2 ||
    value.length > 63 ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
  ) {
    throw new Error(`${path} is not a valid API ID.`)
  }
  return value
}

function optionalBoolean(value: unknown, fallback: boolean, path: string) {
  if (value === undefined) return fallback
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean.`)
  return value
}

function isUrlOrPath(value: string) {
  if (value.startsWith("/")) return true
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
