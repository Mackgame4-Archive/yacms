"use client"

import { useActionState, useId, useMemo, useState } from "react"
import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  saveContentEntryAction,
  type ContentEntryFormState,
} from "@/app/actions/content-entries"
import { Button } from "@/components/ui/button"
import { DeleteContentConfirmation } from "@/components/delete-content-confirmation"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxValue } from "@/components/ui/combobox"
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
import { Toggle } from "@/components/ui/toggle"
import type {
  SafeContentEntry,
  SafeContentType,
  SafeFieldDefinition,
} from "@/lib/content-schema"

const initialState: ContentEntryFormState = {}
const localFileChoice = "__local_file__"

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
  const [published, setPublished] = useState(entry?.status === "published")
  const saveFormId = useId()
  const label = entry ? entryLabel(contentType, entry) : `New ${contentType.name}`

  return (
    <article className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {entry?.status ?? "New entry"}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{label}</h2>
      </div>
      <form id={saveFormId} action={action}>
        <input type="hidden" name="contentTypeId" value={contentType.id} />
        {entry && <input type="hidden" name="entryId" value={entry.id} />}
        <input type="hidden" name="published" value={published ? "on" : ""} />
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
          <FormMessage state={state} />
        </FieldGroup>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Toggle type="button" variant="outline" size="sm" pressed={published} onPressedChange={setPublished} disabled={pending} aria-label={published ? "Published; click to set draft" : "Draft; click to publish"} className="aria-pressed:bg-primary/10 aria-pressed:text-primary">
            <HugeiconsIcon icon={published ? EyeIcon : EyeOffIcon} strokeWidth={2} />
            {published ? "Published" : "Draft"}
          </Toggle>
          {entry && (
            <DeleteContentConfirmation
              kind="entry"
              contentTypeId={contentType.id}
              itemId={entry.id}
              itemName={label}
              disabled={pending}
            />
          )}
        </div>
        <Button type="submit" form={saveFormId} disabled={pending}>
          {pending ? "Saving…" : entry ? "Save entry" : "Create entry"}
        </Button>
      </div>
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

  if (field.type === "media") {
    return <MediaEntryField field={field} value={value} options={options} id={id} />
  }

  if (field.type === "relation") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{field.name}</FieldLabel>
        <Select
          id={id}
          name={field.apiId}
          defaultValue={field.multiple ? values : value == null ? null : String(value)}
          multiple={field.multiple}
          required={field.required}
          items={field.multiple || field.required ? options : [{ value: null, label: "No relation" }, ...options]}
        >
          <SelectTrigger className="w-full">
            {field.multiple ? (
              <SelectValue>
                {(selected: string[]) => selected.length
                  ? selected.map((item) => options.find((option) => option.value === item)?.label ?? item).join(", ")
                  : "No relations"}
              </SelectValue>
            ) : <SelectValue placeholder="No relation" />}
          </SelectTrigger>
          <SelectContent>
            {!field.multiple && !field.required && <SelectItem value={null}>No relation</SelectItem>}
            {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

function MediaEntryField({ field, value, options, id }: { field: SafeFieldDefinition; value: unknown; options: Array<{ value: string; label: string }>; id: string }) {
  const initialValues = Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)]
  const initialPaths = initialValues.filter((item) => item.startsWith("/"))
  const choices = useMemo(() => [{ value: localFileChoice, label: "LOCAL FILE" }, ...options], [options])
  const [selection, setSelection] = useState<string[]>([...initialValues.filter((item) => !item.startsWith("/")), ...(initialPaths.length ? [localFileChoice] : [])])
  const [localPaths, setLocalPaths] = useState(initialPaths.join("\n"))
  const selectedChoices = selection.flatMap((item) => choices.filter((choice) => choice.value === item))
  const hasLocalFile = selection.includes(localFileChoice)

  return <Field>
    <FieldLabel htmlFor={id}>{field.name}</FieldLabel>
    {field.multiple ? <Combobox items={choices} multiple value={selectedChoices} onValueChange={(next) => setSelection(next.map((item) => item.value))}>
      <ComboboxChips className="w-full"><ComboboxValue>{(selectedItems: typeof choices) => selectedItems.map((item) => <ComboboxChip key={item.value}>{item.label}</ComboboxChip>)}</ComboboxValue><ComboboxChipsInput id={id} placeholder="Search media or choose LOCAL FILE" /></ComboboxChips>
      <ComboboxContent><ComboboxEmpty>No matching media.</ComboboxEmpty><ComboboxList>{(item: (typeof choices)[number]) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxList></ComboboxContent>
    </Combobox> : <Combobox items={choices} value={selectedChoices[0] ?? null} onValueChange={(next) => setSelection(next ? [next.value] : [])}>
      <ComboboxInput id={id} className="w-full" placeholder="Search media or choose LOCAL FILE" showClear={!field.required} />
      <ComboboxContent><ComboboxEmpty>No matching media.</ComboboxEmpty><ComboboxList>{(item: (typeof choices)[number]) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxList></ComboboxContent>
    </Combobox>}
    {selection.filter((item) => item !== localFileChoice).map((item) => <input key={item} type="hidden" name={field.apiId} value={item} />)}
    {hasLocalFile && (field.multiple ? <><Textarea value={localPaths} onChange={(event) => setLocalPaths(event.target.value)} name={field.apiId} aria-label={`${field.name} local file paths`} placeholder="/assets/clipping-logo.png" rows={3} required={field.required && selection.length === 1} /><FieldDescription>Enter one website path per line, starting with /.</FieldDescription></> : <><Input value={localPaths} onChange={(event) => setLocalPaths(event.target.value)} name={field.apiId} aria-label={`${field.name} local file path`} placeholder="/assets/clipping-logo.png" required={field.required} /><FieldDescription>Enter a path served by your website, starting with /.</FieldDescription></>)}
  </Field>
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
