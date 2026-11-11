"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock01Icon, Delete01Icon, Download01Icon, File01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { removeMediaAction, type MediaActionState } from "@/app/actions/media"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type UploadedFile = { id: string; filename: string; contentType: string; size: number; connectionId: string; key: string; createdAt: string }
type Connection = { id: string; name: string }

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadHistory({ files, connections }: { files: UploadedFile[]; connections: Connection[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<UploadedFile | null>(null)
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const visibleFiles = files.filter((file) => !deletedIds.includes(file.id))
  const names = new Map(connections.map((connection) => [connection.id, connection.name]))
  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setSelected(null) }}>
    <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}><HugeiconsIcon icon={Clock01Icon} className="size-4" /> Upload history</DialogTrigger>
    <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-2xl">
      <DialogHeader><DialogTitle>{selected ? "Delete uploaded file?" : "Upload history"}</DialogTitle><DialogDescription>{selected ? `This will permanently delete ${selected.filename} from storage and the YACMS media library.` : `Files uploaded to this website through YACMS. ${visibleFiles.length} total.`}</DialogDescription></DialogHeader>
      {selected ? <DeleteUploadForm key={selected.id} file={selected} onCancel={() => setSelected(null)} onDeleted={() => { setDeletedIds((ids) => [...ids, selected.id]); setSelected(null) }} /> : <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
        {visibleFiles.length ? visibleFiles.map((file) => <div key={file.id} className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={File01Icon} className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="truncate font-medium" title={file.filename}>{file.filename}</p><p className="truncate text-xs text-muted-foreground">{names.get(file.connectionId) ?? "Storage connection"} · {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}</p></div>
          <a href={`/media/${file.connectionId}/download?key=${encodeURIComponent(file.key)}`} target="_blank" rel="noreferrer" aria-label={`Open ${file.filename}`} title="Open file" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><HugeiconsIcon icon={Download01Icon} className="size-4" /></a>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Delete ${file.filename}`} title="Delete file" onClick={() => setSelected(file)}><HugeiconsIcon icon={Delete01Icon} className="size-4 text-destructive" /></Button>
        </div>) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No files have been uploaded yet.</p>}
      </div>}
    </DialogContent>
  </Dialog>
}

function DeleteUploadForm({ file, onCancel, onDeleted }: { file: UploadedFile; onCancel: () => void; onDeleted: () => void }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(async (previous: MediaActionState, data: FormData) => {
    const result = await removeMediaAction(previous, data)
    if (result.success) { onDeleted(); router.refresh() }
    return result
  }, {} as MediaActionState)
  return <form action={action} className="space-y-4"><input type="hidden" name="mediaId" value={file.id} /><p className="rounded-xl border bg-background p-3 text-sm font-medium break-all">{file.filename}</p>{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Deleting…" : "Delete file"}</Button></div></form>
}
