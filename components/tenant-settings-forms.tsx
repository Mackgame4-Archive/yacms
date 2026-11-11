"use client"

import { useActionState, useState, useSyncExternalStore } from "react"

import {
  deleteTenantAction,
  regenerateTenantApiTokenAction,
  updateTenantNameAction,
  type ApiTokenState,
  type TenantSettingsState,
} from "@/app/actions/tenant-settings"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: TenantSettingsState = {}
const subscribeToOrigin = () => () => {}

export function TenantSettingsForms({
  name,
  slug,
  apiTokenInfo,
}: {
  name: string
  slug: string
  apiTokenInfo: { last4: string; createdAt: string } | null
}) {
  return (
    <div className="grid gap-6">
      <NameForm name={name} slug={slug} />
      <ApiTokenForm slug={slug} apiTokenInfo={apiTokenInfo} />
      <DeleteForm slug={slug} />
    </div>
  )
}

function ApiTokenForm({
  slug,
  apiTokenInfo,
}: {
  slug: string
  apiTokenInfo: { last4: string; createdAt: string } | null
}) {
  const [state, action, pending] = useActionState<ApiTokenState, FormData>(
    regenerateTenantApiTokenAction,
    {}
  )
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    () => "https://your-cms-host"
  )
  const apiUrl = `${origin}/api/${slug}/content`

  async function copyToken() {
    if (!state.token) return
    try {
      await navigator.clipboard.writeText(state.token)
      setCopiedToken(state.token)
    } catch {
      setCopiedToken(null)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">API token</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Give a server side website read access to this website&apos;s published content.
        </p>
      </div>

      {apiTokenInfo && (
        <p className="mb-5 text-sm text-muted-foreground">
          Active token ending in <span className="font-mono text-foreground">{apiTokenInfo.last4}</span>
          {` · created ${new Date(apiTokenInfo.createdAt).toLocaleDateString()}`}
        </p>
      )}

      {apiTokenInfo ? (
        <AlertDialog key={state.token}>
          <AlertDialogTrigger className={buttonVariants({ variant: "outline" })}>
            Regenerate token
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate API token?</AlertDialogTitle>
              <AlertDialogDescription>
                The current token will stop working immediately. Update connected websites with the new token before their next build.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form action={action}>
              {state.status === "error" && <FieldError className="mb-4">{state.message}</FieldError>}
              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={pending}>Cancel</AlertDialogCancel>
                <AlertDialogAction type="submit" disabled={pending}>
                  {pending ? "Regenerating…" : "Regenerate token"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <form action={action}>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create token"}
          </Button>
        </form>
      )}

      {!apiTokenInfo && state.status === "error" && <FieldError className="mt-4">{state.message}</FieldError>}
      {state.token && (
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p role="status" className="mb-3 text-sm font-medium">{state.message}</p>
          <div className="flex flex-wrap gap-2">
            <Input aria-label="New API token" value={state.token} readOnly className="min-w-0 flex-1 font-mono" />
            <Button type="button" variant="outline" onClick={copyToken}>
              {copiedToken === state.token ? "Copied" : "Copy token"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium">Astro environment variables</p>
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-6"><code>{`CMS_URL_API=${apiUrl}\nCMS_API_TOKEN=${state.token ?? "your-api-token"}`}</code></pre>
        <p className="text-xs text-muted-foreground">
          Keep the token in the website&apos;s server environment. Send it as an Authorization: Bearer header when fetching a content type.
        </p>
      </div>
    </section>
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
