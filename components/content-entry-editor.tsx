"use client"

import { useActionState } from "react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  deleteContentEntryAction,
  saveContentEntryAction,
  type ContentEntryFormState,
} from "@/app/actions/content-entries"
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
import type {
  SafeContentEntry,
  SafeContentType,
  SafeFieldDefinition,
} from "@/lib/content-schema"

const initialState: ContentEntryFormState = {}

export type RelationOptions = Record<
  string,
  Array<{ value: string; label: string }>
>

export function ContentEntryEditor({
  contentType,
  entries,
  relationOptions,
  mediaOptions,
}: {
  contentType: SafeContentType
  entries: SafeContentEntry[]
  relationOptions: RelationOptions
  mediaOptions: Array<{ value: string; label: string }>
}) {
  if (contentType.fields.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <h2 className="font-medium">Add fields before creating content</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This type has no schema yet.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <EntryForm
        contentType={contentType}
        relationOptions={relationOptions}
        mediaOptions={mediaOptions}
      />
      {entries.map((entry) => (
        <EntryForm
          key={entry.id}
          contentType={contentType}
          entry={entry}
          relationOptions={relationOptions}
          mediaOptions={mediaOptions}
        />
      ))}
    </div>
  )
}

function EntryForm({
  contentType,
  entry,
  relationOptions,
  mediaOptions,
}: {
  contentType: SafeContentType
  entry?: SafeContentEntry
  relationOptions: RelationOptions
  mediaOptions: Array<{ value: string; label: string }>
}) {
  const [state, action, pending] = useActionState(
    saveContentEntryAction,
    initialState
  )
  const label = entry ? entryLabel(contentType, entry) : `New ${contentType.name}`

  return (
    <article className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {entry?.status ?? "New entry"}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{label}</h2>
      </div>
      <form action={action}>
        <input type="hidden" name="contentTypeId" value={contentType.id} />
        {entry && <input type="hidden" name="entryId" value={entry.id} />}
        <FieldGroup className="gap-5">
          {contentType.fields.map((field) => (
            <EntryField
              key={field.id}
              field={field}
              value={entry?.values[field.apiId]}
              options={field.type === "media" ? mediaOptions : relationOptions[field.apiId] ?? []}
              entryId={entry?.id ?? "new"}
            />
          ))}
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              name="published"
              defaultChecked={entry?.status === "published"}
            />
            Published
          </label>
          <FormMessage state={state} />
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : entry ? "Save entry" : "Create entry"}
            </Button>
          </div>
        </FieldGroup>
      </form>
      {entry && (
        <form action={deleteContentEntryAction} className="mt-4 border-t pt-4">
          <input type="hidden" name="contentTypeId" value={contentType.id} />
          <input type="hidden" name="entryId" value={entry.id} />
          <Button type="submit" variant="destructive" size="sm">
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            Delete entry
          </Button>
        </form>
      )}
    </article>
  )
}

function EntryField({
  field,
  value,
  options,
  entryId,
}: {
  field: SafeFieldDefinition
  value: unknown
  options: Array<{ value: string; label: string }>
  entryId: string
}) {
  const id = `${entryId}-${field.apiId}`
  const values = Array.isArray(value) ? value.map(String) : []

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          name={field.apiId}
          defaultChecked={value === true}
        />
        {field.name}
      </label>
    )
  }

  if (field.type === "relation" || field.type === "media") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.name}</FieldLabel>
        <Select
          id={id}
          name={field.apiId}
          defaultValue={field.multiple ? values : value == null ? null : String(value)}
          multiple={field.multiple}
          required={field.required}
          items={field.multiple || field.required ? options : [{ value: null, label: field.type === "media" ? "No media" : "No relation" }, ...options]}
        >
          <SelectTrigger className="w-full">
            {field.multiple ? (
              <SelectValue>
                {(selected: string[]) => selected.length
                  ? selected.map((item) => options.find((option) => option.value === item)?.label ?? item).join(", ")
                  : field.type === "media" ? "No media" : "No relations"}
              </SelectValue>
            ) : <SelectValue placeholder={field.type === "media" ? "Choose media" : "No relation"} />}
          </SelectTrigger>
          <SelectContent>
            {!field.multiple && !field.required && <SelectItem value={null}>{field.type === "media" ? "No media" : "No relation"}</SelectItem>}
            {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.type === "media" && options.length === 0 && <FieldDescription>Connect S3 and upload a file in Media first.</FieldDescription>}
      </Field>
    )
  }

  if (field.type === "longText" || field.multiple) {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.name}</FieldLabel>
        <Textarea
          id={id}
          name={field.apiId}
          defaultValue={field.multiple ? values.join("\n") : String(value ?? "")}
          rows={field.type === "longText" ? 5 : 3}
          required={field.required}
        />
        {field.multiple && (
          <FieldDescription>Enter one value per line.</FieldDescription>
        )}
      </Field>
    )
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{field.name}</FieldLabel>
      <Input
        id={id}
        name={field.apiId}
        type={inputType(field)}
        defaultValue={value == null ? "" : String(value)}
        required={field.required}
        step={field.type === "number" ? "any" : undefined}
      />
    </Field>
  )
}

function inputType(field: SafeFieldDefinition) {
  if (field.type === "number") return "number"
  if (field.type === "date") return "date"
  if (field.type === "url") return "url"
  return "text"
}

function entryLabel(contentType: SafeContentType, entry: SafeContentEntry) {
  const firstTextField = contentType.fields.find(
    (field) => field.type === "shortText" && !field.multiple
  )
  const value = firstTextField && entry.values[firstTextField.apiId]
  return typeof value === "string" && value ? value : `Entry ${entry.id.slice(-6)}`
}

function FormMessage({ state }: { state: ContentEntryFormState }) {
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
