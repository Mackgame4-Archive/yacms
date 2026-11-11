"use client"

import { useActionState, useState, useSyncExternalStore } from "react"

import {
  addFormFieldAction,
  createFormSchemaAction,
  updateFormSchemaAction,
  type FormSchemaActionState,
} from "@/app/actions/forms"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  formFieldTypes,
  type FormFieldType,
  type SafeFormSchema,
} from "@/lib/form-schema"

const initialState: FormSchemaActionState = {}
const subscribeToOrigin = () => () => {}

const formFieldTypeLabels: Record<FormFieldType, string> = {
  text: "Text",
  email: "Email",
  textarea: "Long text",
  number: "Number",
  tel: "Phone",
  url: "URL",
  checkbox: "Checkbox",
}

export function CreateFormSchemaForm() {
  const [state, action, pending] = useActionState(
    createFormSchemaAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">New form</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define the body accepted by a website form.
        </p>
      </div>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="new-form-name">Name</FieldLabel>
          <Input
            id="new-form-name"
            name="name"
            placeholder="Contact form"
            minLength={2}
            maxLength={80}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-form-api-id">API ID</FieldLabel>
          <Input
            id="new-form-api-id"
            name="apiId"
            placeholder="contact"
            pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
            minLength={2}
            maxLength={63}
          />
          <FieldDescription>
            Optional. Generated from the name and permanent after creation.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="new-form-description">Description</FieldLabel>
          <Textarea
            id="new-form-description"
            name="description"
            placeholder="Messages submitted from the contact page."
            maxLength={500}
          />
        </Field>
        <ActionMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create form"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function FormSchemaDetailsForm({ form }: { form: SafeFormSchema }) {
  const [state, action, pending] = useActionState(
    updateFormSchemaAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <input type="hidden" name="formId" value={form.id} />
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Form details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The API ID stays fixed so the website endpoint does not change.
        </p>
      </div>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="form-schema-name">Name</FieldLabel>
          <Input
            id="form-schema-name"
            name="name"
            defaultValue={form.name}
            minLength={2}
            maxLength={80}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="form-schema-api-id">API ID</FieldLabel>
          <Input
            id="form-schema-api-id"
            value={form.apiId}
            className="bg-muted/50 font-mono text-muted-foreground"
            readOnly
            aria-readonly="true"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="form-schema-description">
            Description
          </FieldLabel>
          <Textarea
            id="form-schema-description"
            name="description"
            defaultValue={form.description}
            maxLength={500}
          />
        </Field>
        <ActionMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function AddFormFieldForm({ formId }: { formId: string }) {
  const [state, action, pending] = useActionState(
    addFormFieldAction,
    initialState
  )
  const [type, setType] = useState<FormFieldType>("text")

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <input type="hidden" name="formId" value={formId} />
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Add field</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Incoming JSON is validated against these fields.
        </p>
      </div>
      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="form-field-name">Name</FieldLabel>
            <Input
              id="form-field-name"
              name="name"
              placeholder="Email"
              maxLength={80}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="form-field-api-id">API ID</FieldLabel>
            <Input
              id="form-field-api-id"
              name="apiId"
              placeholder="email"
              pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
              maxLength={63}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="form-field-type">Field type</FieldLabel>
          <Select
            id="form-field-type"
            name="type"
            value={type}
            onValueChange={(value) => setType(value as FormFieldType)}
            items={formFieldTypes.map((fieldType) => ({
              value: fieldType,
              label: formFieldTypeLabels[fieldType],
            }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formFieldTypes.map((fieldType) => (
                <SelectItem key={fieldType} value={fieldType}>
                  {formFieldTypeLabels[fieldType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox name="required" />
          Required
        </label>
        <ActionMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add field"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function FormEndpointField({
  tenantSlug,
  formApiId,
}: {
  tenantSlug: string
  formApiId: string
}) {
  const [copied, setCopied] = useState(false)
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    () => "https://your-cms-host"
  )
  const endpoint = `${origin}/api/${tenantSlug}/forms/${formApiId}`

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(endpoint)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Submission endpoint</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a JSON POST request from the website to this public URL.
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor="form-endpoint">POST URL</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="form-endpoint"
            value={endpoint}
            className="bg-muted/50 font-mono text-muted-foreground"
            readOnly
            aria-readonly="true"
          />
          <Button type="button" variant="outline" onClick={copyEndpoint}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </Field>
    </section>
  )
}

function ActionMessage({ state }: { state: FormSchemaActionState }) {
  if (!state.message) return null
  if (state.status === "error") {
    return (
      <FieldError className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
        {state.message}
      </FieldError>
    )
  }
  return (
    <p
      role="status"
      className="rounded-xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {state.message}
    </p>
  )
}
