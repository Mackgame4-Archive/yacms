import "server-only"

import { model, models, Schema, type Model, type Types } from "mongoose"

export type FormSubmissionRecord = {
  tenantId: Types.ObjectId
  formId: Types.ObjectId
  values: Map<string, string | number | boolean>
  createdAt: Date
  updatedAt: Date
}

const formSubmissionSchema = new Schema<FormSubmissionRecord>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    formId: {
      type: Schema.Types.ObjectId,
      ref: "FormSchema",
      required: true,
      index: true,
    },
    values: { type: Map, of: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
)

formSubmissionSchema.index({ tenantId: 1, formId: 1, createdAt: -1 })

export const FormSubmissionModel =
  (models.FormSubmission as Model<FormSubmissionRecord> | undefined) ??
  model<FormSubmissionRecord>("FormSubmission", formSubmissionSchema)
