"use client"
import { useActionState, useState } from "react"
import { addConnectionAction, removeConnectionAction, removeMediaAction, uploadMediaAction, type MediaActionState } from "@/app/actions/media"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ConnectionOption = { id: string; name: string; bucket: string; region: string; endpoint: string }

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
      <FieldDescription>Credentials are encrypted in the database. The key must be configured on the app server.</FieldDescription>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Connecting…" : "Connect bucket"}</Button>
    </FieldGroup>
  </form>
}

export function UploadForm({ connections }: { connections: ConnectionOption[] }) {
  const [state, action, pending] = useActionState(uploadMediaAction, {} as MediaActionState)
  return <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
    <h2 className="mb-5 text-lg font-semibold">Upload media</h2>
    <FieldGroup className="gap-4">
      <Field><FieldLabel htmlFor="media-connection">Storage connection</FieldLabel>
        <Select name="connectionId" required defaultValue={connections[0]?.id} items={connections.map((item) => ({ value: item.id, label: item.name }))}>
          <SelectTrigger className="w-full" id="media-connection"><SelectValue placeholder="Choose storage" /></SelectTrigger>
          <SelectContent>{connections.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field><FieldLabel htmlFor="media-file">File</FieldLabel><Input id="media-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" required /></Field>
      <FieldDescription>Images and PDFs up to 10 MB. Files are sent directly to the selected bucket by the app server.</FieldDescription>
      <Message state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Upload file"}</Button>
    </FieldGroup>
  </form>
}

export function RemoveConnectionForm({ connectionId }: { connectionId: string }) {
  const [state, action, pending] = useActionState(removeConnectionAction, {} as MediaActionState)
  return <form action={action} className="mt-3"><input type="hidden" name="connectionId" value={connectionId} />
    <Button type="submit" size="sm" variant="destructive" disabled={pending}>Remove connection</Button><Message state={state} />
  </form>
}

export function RemoveMediaForm({ mediaId }: { mediaId: string }) {
  const [state, action, pending] = useActionState(removeMediaAction, {} as MediaActionState)
  return <form action={action} className="mt-3"><input type="hidden" name="mediaId" value={mediaId} />
    <Button type="submit" size="sm" variant="destructive" disabled={pending}>Delete file</Button><Message state={state} />
  </form>
}

function Message({ state }: { state: MediaActionState }) {
  if (!state.error && !state.success) return null
  return <p role="status" className={state.error ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{state.error ?? state.success}</p>
}
