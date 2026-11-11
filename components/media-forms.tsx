"use client"
import { useActionState, useState } from "react"
import { addConnectionAction, removeConnectionAction, type MediaActionState } from "@/app/actions/media"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ConnectionForm() {
  const [fields, setFields] = useState({ name: "", bucket: "", region: "", endpoint: "", accessKeyId: "", secretAccessKey: "" })
  const [state, action, pending] = useActionState(async (previous: MediaActionState, data: FormData) => {
    const result = await addConnectionAction(previous, data)
    if (result.success) setFields({ name: "", bucket: "", region: "", endpoint: "", accessKeyId: "", secretAccessKey: "" })
    return result
  }, {} as MediaActionState)
  return <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
    <h2 className="mb-5 text-lg font-semibold">Add S3 connection</h2>
    <FieldGroup className="gap-4">
      {([ ["name", "Connection name", "Production assets"], ["bucket", "Bucket", "my-bucket"], ["region", "Region", "eu-west-1"], ["endpoint", "Custom endpoint (optional)", "https://s3.example.com"], ["accessKeyId", "Access key ID", ""], ["secretAccessKey", "Secret access key", ""] ] as const).map(([key, label, placeholder]) => <Field key={key}>
        <FieldLabel htmlFor={`s3-${key}`}>{label}</FieldLabel>
        <Input id={`s3-${key}`} name={key} placeholder={placeholder} type={key === "secretAccessKey" ? "password" : "text"} required={key !== "endpoint"} autoComplete="off" value={fields[key]} onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))} />
      </Field>)}
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Connecting…" : "Connect bucket"}</Button>
    </FieldGroup>
  </form>
}

export function RemoveConnectionForm({ connectionId }: { connectionId: string }) {
  const [state, action, pending] = useActionState(removeConnectionAction, {} as MediaActionState)
  return <form action={action} className="mt-3"><input type="hidden" name="connectionId" value={connectionId} />
    <Button type="submit" size="sm" variant="destructive" disabled={pending}>Remove connection</Button><Message state={state} />
  </form>
}

function Message({ state }: { state: MediaActionState }) {
  if (!state.error && !state.success) return null
  return <p role="status" className={state.error ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{state.error ?? state.success}</p>
}
