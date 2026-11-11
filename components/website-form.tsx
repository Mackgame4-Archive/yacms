"use client"

import { useActionState } from "react"

import {
  createTenantAction,
  type TenantFormState,
} from "@/app/actions/tenants"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: TenantFormState = {}

export function WebsiteForm() {
  const [state, action, pending] = useActionState(
    createTenantAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="website-name">Website name</FieldLabel>
          <Input
            id="website-name"
            name="name"
            defaultValue={state.fields?.name}
            minLength={2}
            maxLength={80}
            placeholder="Acme Docs"
            className="h-11 shadow-xs"
            autoFocus
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="website-slug">Slug</FieldLabel>
          <Input
            id="website-slug"
            name="slug"
            defaultValue={state.fields?.slug}
            minLength={2}
            maxLength={63}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="acme-docs"
            aria-describedby="website-slug-description"
            className="h-11 shadow-xs"
          />
          <FieldDescription id="website-slug-description">
            Optional. Generated from the name when left blank.
          </FieldDescription>
        </Field>

        {state.error && (
          <FieldError className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            {state.error}
          </FieldError>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Add website"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
