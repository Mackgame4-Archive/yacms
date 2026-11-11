export const fieldTypes = [
  "shortText",
  "longText",
  "number",
  "boolean",
  "date",
  "url",
  "media",
  "relation",
] as const

export type FieldType = (typeof fieldTypes)[number]

export type SafeFieldDefinition = {
  id: string
  name: string
  apiId: string
  type: FieldType
  required: boolean
  multiple: boolean
  relatedContentTypeId?: string
}

export type SafeContentType = {
  id: string
  name: string
  apiId: string
  description: string
  fields: SafeFieldDefinition[]
  createdAt: Date
  updatedAt: Date
}

export type SafeContentEntry = {
  id: string
  values: Record<string, unknown>
  status: "draft" | "published"
  createdAt: Date
  updatedAt: Date
}
