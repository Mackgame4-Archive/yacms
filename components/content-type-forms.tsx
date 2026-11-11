"use client"

import { useActionState, useState } from "react"

import {
  addContentTypeFieldAction,
  createContentTypeAction,
  updateContentTypeAction,
  type ContentTypeFormState,
} from "@/app/actions/content-types"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  fieldTypes,
  type FieldType,
  type SafeContentType,
} from "@/lib/content-schema"

const initialState: ContentTypeFormState = {}

const fieldTypeLabels: Record<FieldType, string> = {
  shortText: "Short text",
  longText: "Long text",
  number: "Number",
  boolean: "Boolean",
  date: "Date",
  url: "URL",
  media: "Media URL",
  relation: "Relation",
}

export function CreateContentTypeForm() {
  const [state, action, pending] = useActionState(
    createContentTypeAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">New content type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define a reusable data shape for this website.
        </p>
      </div>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="content-type-name">Name</FieldLabel>
          <Input
            id="content-type-name"
            name="name"
            placeholder="Article"
            minLength={2}
            maxLength={80}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="content-type-api-id">API ID</FieldLabel>
          <Input
            id="content-type-api-id"
            name="apiId"
            placeholder="articles"
            pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
            minLength={2}
            maxLength={63}
          />
          <FieldDescription>
            Optional. Generated from the name and permanent after creation.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="content-type-description">Description</FieldLabel>
          <Textarea
            id="content-type-description"
            name="description"
            placeholder="Editorial content displayed on the public website."
            maxLength={500}
          />
        </Field>
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create content type"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function ContentTypeDetailsForm({
  contentType,
}: {
  contentType: SafeContentType
}) {
  const [state, action, pending] = useActionState(
    updateContentTypeAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <input type="hidden" name="contentTypeId" value={contentType.id} />
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Type details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The API ID stays fixed so connected websites do not break.
        </p>
      </div>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="content-type-name">Name</FieldLabel>
          <Input
            id="content-type-name"
            name="name"
            defaultValue={contentType.name}
            minLength={2}
            maxLength={80}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="content-type-api-id">API ID</FieldLabel>
          <Input
            id="content-type-api-id"
            value={contentType.apiId}
            className="bg-muted/50 font-mono text-muted-foreground"
            readOnly
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="content-type-description">Description</FieldLabel>
          <Textarea
            id="content-type-description"
            name="description"
            defaultValue={contentType.description}
            maxLength={500}
          />
        </Field>
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export function AddContentTypeFieldForm({
  contentTypeId,
  contentTypes,
}: {
  contentTypeId: string
  contentTypes: SafeContentType[]
}) {
  const [state, action, pending] = useActionState(
    addContentTypeFieldAction,
    initialState
  )
  const [type, setType] = useState<FieldType>("shortText")

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <input type="hidden" name="contentTypeId" value={contentTypeId} />
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Add field</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fields define the values editors can enter for this type.
        </p>
      </div>
      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="field-name">Name</FieldLabel>
            <Input
              id="field-name"
              name="name"
              placeholder="Title"
              maxLength={80}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="field-api-id">API ID</FieldLabel>
            <Input
              id="field-api-id"
              name="apiId"
              placeholder="title"
              pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
              maxLength={63}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="field-type">Field type</FieldLabel>
          <Select
            id="field-type"
            name="type"
            value={type}
            onValueChange={(value) => setType(value as FieldType)}
            items={fieldTypes.map((fieldType) => ({ value: fieldType, label: fieldTypeLabels[fieldType] }))}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{fieldTypes.map((fieldType) => (
              <SelectItem key={fieldType} value={fieldType}>{fieldTypeLabels[fieldType]}</SelectItem>
            ))}</SelectContent>
          </Select>
        </Field>
        {type === "relation" && (
          <Field>
            <FieldLabel htmlFor="field-related-type">
              Related content type
            </FieldLabel>
            <Select
              id="field-related-type"
              name="relatedContentTypeId"
              required
              items={contentTypes.map((contentType) => ({ value: contentType.id, label: contentType.name }))}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a type" /></SelectTrigger>
              <SelectContent>{contentTypes.map((contentType) => (
                <SelectItem key={contentType.id} value={contentType.id}>{contentType.name}</SelectItem>
              ))}</SelectContent>
            </Select>
            <FieldDescription>
              Entries can reference entries from the selected type.
            </FieldDescription>
          </Field>
        )}
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox name="required" />
            Required
          </label>
          {type !== "boolean" && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox name="multiple" />
              Multiple values
            </label>
          )}
        </div>
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add field"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function FormMessage({ state }: { state: ContentTypeFormState }) {
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
