export const formFieldTypes = [
  "text",
  "email",
  "textarea",
  "number",
  "tel",
  "url",
  "checkbox",
] as const

export type FormFieldType = (typeof formFieldTypes)[number]

export type SafeFormField = {
  id: string
  name: string
  apiId: string
  type: FormFieldType
  required: boolean
}

export type SafeFormSchema = {
  id: string
  name: string
  apiId: string
  description: string
  fields: SafeFormField[]
  createdAt: Date
  updatedAt: Date
}

export type SubmissionValidation =
  | { success: true; values: Record<string, string | number | boolean> }
  | { success: false; fields: Record<string, string> }

export function validateFormSubmission(
  schema: SafeFormSchema,
  input: unknown
): SubmissionValidation {
  if (!isPlainObject(input)) {
    return { success: false, fields: { _root: "Expected a JSON object." } }
  }

  const errors: Record<string, string> = {}
  const values: Record<string, string | number | boolean> = {}
  const allowedFields = new Set(schema.fields.map((field) => field.apiId))

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) errors[key] = "Unknown field."
  }

  for (const field of schema.fields) {
    const value = input[field.apiId]
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")

    if (missing) {
      if (field.required) errors[field.apiId] = "This field is required."
      continue
    }

    const error = validateValue(field.type, value)
    if (error) {
      errors[field.apiId] = error
      continue
    }

    values[field.apiId] =
      typeof value === "string" ? value.trim() : (value as number | boolean)
  }

  return Object.keys(errors).length
    ? { success: false, fields: errors }
    : { success: true, values }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function validateValue(type: FormFieldType, value: unknown) {
  if (type === "checkbox") {
    return typeof value === "boolean" ? null : "Expected true or false."
  }
  if (type === "number") {
    return typeof value === "number" && Number.isFinite(value)
      ? null
      : "Expected a number."
  }
  if (typeof value !== "string") return "Expected text."

  const trimmed = value.trim()
  const maxLength = type === "textarea" ? 10_000 : 500
  if (trimmed.length > maxLength) {
    return `Must be ${maxLength.toLocaleString()} characters or fewer.`
  }
  if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address."
  }
  if (type === "url") {
    try {
      const url = new URL(trimmed)
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "Enter an HTTP or HTTPS URL."
      }
    } catch {
      return "Enter a valid URL."
    }
  }
  return null
}
