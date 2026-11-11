"use client"

import { useActionState } from "react"

import {
  updateSmtpSettingsAction,
  type SmtpSettingsState,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SafeSmtpSettings } from "@/lib/smtp-settings"

const initialState: SmtpSettingsState = {}
const securityOptions = [
  { value: "none", label: "None" },
  { value: "starttls", label: "STARTTLS" },
  { value: "tls", label: "TLS" },
]

export function SmtpSettingsForm({
  settings,
  websiteName,
}: {
  settings: SafeSmtpSettings | null
  websiteName: string
}) {
  const [state, action, pending] = useActionState(
    updateSmtpSettingsAction,
    initialState
  )

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">SMTP</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the mail server that form notifications will use later.
          Saving these settings does not send email yet.
        </p>
      </div>

      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field>
            <FieldLabel htmlFor="smtp-host">Host</FieldLabel>
            <Input
              id="smtp-host"
              name="host"
              defaultValue={settings?.host}
              placeholder="smtp.example.com"
              maxLength={255}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-port">Port</FieldLabel>
            <Input
              id="smtp-port"
              name="port"
              type="number"
              defaultValue={settings?.port ?? 587}
              min={1}
              max={65535}
              required
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="smtp-security">Security</FieldLabel>
          <Select
            id="smtp-security"
            name="security"
            defaultValue={settings?.security ?? "starttls"}
            items={securityOptions}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {securityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="smtp-username">Username</FieldLabel>
            <Input
              id="smtp-username"
              name="username"
              defaultValue={settings?.username}
              maxLength={255}
              autoComplete="username"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-password">Password</FieldLabel>
            <Input
              id="smtp-password"
              name="password"
              type="password"
              placeholder={
                settings?.hasPassword ? "Leave blank to keep saved password" : ""
              }
              maxLength={1000}
              autoComplete="new-password"
            />
            {settings?.hasPassword && (
              <FieldDescription>
                A password is saved and encrypted. Enter a new one only to
                replace it.
              </FieldDescription>
            )}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="smtp-from-name">Sender name</FieldLabel>
            <Input
              id="smtp-from-name"
              name="fromName"
              defaultValue={settings?.fromName ?? websiteName}
              maxLength={120}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-from-email">Sender email</FieldLabel>
            <Input
              id="smtp-from-email"
              name="fromEmail"
              type="email"
              defaultValue={settings?.fromEmail}
              placeholder="hello@example.com"
              maxLength={254}
              required
            />
          </Field>
        </div>

        {state.message &&
          (state.status === "error" ? (
            <FieldError className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              {state.message}
            </FieldError>
          ) : (
            <p
              role="status"
              className="rounded-xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
            >
              {state.message}
            </p>
          ))}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save SMTP settings"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
