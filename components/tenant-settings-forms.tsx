"use client"

import { useActionState } from "react"

import {
  deleteTenantAction,
  updateTenantNameAction,
  type TenantSettingsState,
} from "@/app/actions/tenant-settings"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: TenantSettingsState = {}

export function TenantSettingsForms({
  name,
  slug,
}: {
  name: string
  slug: string
}) {
  return (
    <div className="grid gap-6">
      <NameForm name={name} slug={slug} />
      <DeleteForm slug={slug} />
    </div>
  )
}

function NameForm({ name, slug }: { name: string; slug: string }) {
  const [state, action, pending] = useActionState(
    updateTenantNameAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Website details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Change the display name for this website.
        </p>
      </div>

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="tenant-name">Name</FieldLabel>
          <Input
            id="tenant-name"
            name="name"
            defaultValue={state.name ?? name}
            minLength={2}
            maxLength={80}
            className="h-11 shadow-xs"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="tenant-slug">Slug</FieldLabel>
          <Input
            id="tenant-slug"
            value={slug}
            className="h-11 bg-muted/50 font-mono text-muted-foreground shadow-xs"
            readOnly
            aria-readonly="true"
          />
          <FieldDescription>
            The slug is permanent and cannot be changed after creation.
          </FieldDescription>
        </Field>

        <FormMessage state={state} />

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save name"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function DeleteForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(
    deleteTenantAction,
    initialState
  )

  return (
    <form
      action={action}
      className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-destructive">Delete website</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This permanently deletes the website. Type{" "}
          <strong className="font-mono text-foreground">{slug}</strong> to
          confirm.
        </p>
      </div>

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="tenant-delete-confirmation">
            Confirm slug
          </FieldLabel>
          <Input
            id="tenant-delete-confirmation"
            name="confirmation"
            autoComplete="off"
            spellCheck={false}
            className="h-11 font-mono shadow-xs"
            required
          />
        </Field>

        <FormMessage state={state} />

        <div>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Deleting…" : "Delete website"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function FormMessage({ state }: { state: TenantSettingsState }) {
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
