"use client"

import { useActionState } from "react"

import {
  updatePasswordAction,
  updateProfileAction,
  type ProfileFormState,
} from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: ProfileFormState = {}

export function ProfileForms({ name, email }: { name: string; email: string }) {
  return (
    <div className="grid gap-6">
      <AccountForm name={name} email={email} />
      <PasswordForm />
    </div>
  )
}

function AccountForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Account information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the name and email shown across your workspace.
        </p>
      </div>

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="profile-name">Name</FieldLabel>
          <Input
            id="profile-name"
            name="name"
            autoComplete="name"
            defaultValue={state.fields?.name ?? name}
            minLength={2}
            maxLength={60}
            className="h-11 shadow-xs"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-email">Email</FieldLabel>
          <Input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.fields?.email ?? email}
            maxLength={254}
            className="h-11 shadow-xs"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-current-password">
            Current password
          </FieldLabel>
          <Input
            id="profile-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            className="h-11 shadow-xs"
            required
          />
          <FieldDescription>
            Required to confirm changes to your account details.
          </FieldDescription>
        </Field>

        <FormMessage state={state} />

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function PasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Changing your password signs out your other sessions.
        </p>
      </div>

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="password-current">Current password</FieldLabel>
          <Input
            id="password-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            className="h-11 shadow-xs"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password-new">New password</FieldLabel>
          <Input
            id="password-new"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            aria-describedby="new-password-description"
            className="h-11 shadow-xs"
            required
          />
          <FieldDescription id="new-password-description">
            Use 8–128 characters with a letter and number.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="password-confirm">Confirm new password</FieldLabel>
          <Input
            id="password-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            className="h-11 shadow-xs"
            required
          />
        </Field>

        <FormMessage state={state} />

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function FormMessage({ state }: { state: ProfileFormState }) {
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
