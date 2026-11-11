import "server-only"

import { randomUUID } from "node:crypto"
import { Types } from "mongoose"

import {
  type FormFieldType,
  type SafeFormSchema,
  type SafeFormSubmission,
  validateFormSubmission,
} from "@/lib/form-schema"
import { dbConnect } from "@/lib/mongodb"
import {
  FormSchemaModel,
  type FormSchemaDocument,
} from "@/lib/models/form-schema"
import { FormSubmissionModel } from "@/lib/models/form-submission"
import { TenantModel } from "@/lib/models/tenant"

function toSafeFormSchema(form: FormSchemaDocument): SafeFormSchema {
  return {
    id: form._id.toString(),
    name: form.name,
    apiId: form.apiId,
    description: form.description,
    fields: form.fields.map((field) => ({
      id: field.id,
      name: field.name,
      apiId: field.apiId,
      type: field.type,
      required: field.required,
    })),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  }
}

export async function listFormsForTenant(tenantId: string) {
  if (!Types.ObjectId.isValid(tenantId)) return []
  await dbConnect()
  const forms = await FormSchemaModel.find({
    tenantId: new Types.ObjectId(tenantId),
  })
    .sort({ name: 1, _id: 1 })
    .exec()
  return forms.map(toSafeFormSchema)
}

export async function findFormForTenant(tenantId: string, formId: string) {
  if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(formId)) {
    return null
  }
  await dbConnect()
  const form = await FormSchemaModel.findOne({
    _id: new Types.ObjectId(formId),
    tenantId: new Types.ObjectId(tenantId),
  }).exec()
  return form ? toSafeFormSchema(form) : null
}

export async function listFormSubmissions(
  tenantId: string,
  formId: string,
  limit = 100
): Promise<SafeFormSubmission[]> {
  if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(formId)) {
    return []
  }
  await dbConnect()
  const submissions = await FormSubmissionModel.find({
    tenantId: new Types.ObjectId(tenantId),
    formId: new Types.ObjectId(formId),
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .exec()

  return submissions.map((submission) => ({
    id: submission._id.toString(),
    values: Object.fromEntries(submission.values.entries()) as Record<
      string,
      string | number | boolean
    >,
    createdAt: submission.createdAt,
  }))
}

export async function createFormSchema(input: {
  tenantId: string
  name: string
  apiId: string
  description: string
}) {
  if (!Types.ObjectId.isValid(input.tenantId)) return null
  await dbConnect()
  await FormSchemaModel.init()
  try {
    const form = await FormSchemaModel.create({
      tenantId: new Types.ObjectId(input.tenantId),
      name: input.name,
      apiId: input.apiId,
      description: input.description,
      fields: [],
    })
    return toSafeFormSchema(form)
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return null
    throw error
  }
}

export async function updateFormSchema(input: {
  tenantId: string
  formId: string
  name: string
  description: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.formId)
  ) {
    return null
  }
  await dbConnect()
  const form = await FormSchemaModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(input.formId),
      tenantId: new Types.ObjectId(input.tenantId),
    },
    { $set: { name: input.name, description: input.description } },
    { new: true, runValidators: true }
  ).exec()
  return form ? toSafeFormSchema(form) : null
}

export async function addFormField(input: {
  tenantId: string
  formId: string
  name: string
  apiId: string
  type: FormFieldType
  required: boolean
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.formId)
  ) {
    return null
  }
  await dbConnect()
  const form = await FormSchemaModel.findOne({
    _id: new Types.ObjectId(input.formId),
    tenantId: new Types.ObjectId(input.tenantId),
    "fields.apiId": { $ne: input.apiId },
  }).exec()
  if (!form) return null

  form.fields.push({
    id: randomUUID(),
    name: input.name,
    apiId: input.apiId,
    type: input.type,
    required: input.required,
  })
  await form.save()
  return toSafeFormSchema(form)
}

export async function deleteFormField(input: {
  tenantId: string
  formId: string
  fieldId: string
}) {
  if (
    !Types.ObjectId.isValid(input.tenantId) ||
    !Types.ObjectId.isValid(input.formId)
  ) {
    return false
  }
  await dbConnect()
  const result = await FormSchemaModel.updateOne(
    {
      _id: new Types.ObjectId(input.formId),
      tenantId: new Types.ObjectId(input.tenantId),
      "fields.id": input.fieldId,
    },
    { $pull: { fields: { id: input.fieldId } } },
    { runValidators: true }
  )
  return result.modifiedCount === 1
}

export async function createPublicFormSubmission(input: {
  tenantSlug: string
  formApiId: string
  body: unknown
}) {
  await dbConnect()
  const tenant = await TenantModel.findOne({ slug: input.tenantSlug })
    .select("_id")
    .lean()
    .exec()
  if (!tenant) return { status: "not-found" } as const

  const form = await FormSchemaModel.findOne({
    tenantId: tenant._id,
    apiId: input.formApiId,
  }).exec()
  if (!form) return { status: "not-found" } as const

  const schema = toSafeFormSchema(form)
  const validation = validateFormSubmission(schema, input.body)
  if (!validation.success) {
    return { status: "invalid", fields: validation.fields } as const
  }

  const submission = await FormSubmissionModel.create({
    tenantId: tenant._id,
    formId: form._id,
    values: validation.values,
  })
  return {
    status: "created",
    id: submission._id.toString(),
    createdAt: submission.createdAt,
  } as const
}
