"use client"

import { useActionState, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowLeft01Icon, ClipboardPasteIcon, Copy01Icon, Delete01Icon, Download01Icon, Edit01Icon, File01Icon, FileImageIcon, FileMusicIcon, FileTextIcon, FileVideoIcon, Folder01Icon, GridViewIcon, InformationCircleIcon, ListIcon, MoreVerticalIcon, Refresh01Icon, Scissor01Icon, Search01Icon, Upload01Icon } from "@hugeicons/core-free-icons"
import { createFolderAction, deleteBucketFileAction, deleteBucketFolderAction, pasteBucketFileAction, renameBucketFileAction, uploadBucketAction, type BucketState } from "@/app/actions/bucket"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { listBucket } from "@/lib/bucket-explorer"

export type ExplorerFolder = { prefix: string; name: string; depth: number }
type Listing = Awaited<ReturnType<typeof listBucket>>
type Item = { kind: "folder"; prefix: string; name: string } | { kind: "file"; key: string; name: string; size: number; modified: string; mediaId: string | null }
type Operation = "create" | "upload" | "rename" | "delete" | null
type Sort = "name" | "newest" | "size"

function bytes(size: number) {
  if (size < 1024) return `${size} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = size
  let unit = -1
  do { value /= 1024; unit++ } while (value >= 1024 && unit < units.length - 1)
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

function fileIcon(name: string) {
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name)) return FileImageIcon
  if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(name)) return FileMusicIcon
  if (/\.(mp4|webm|mov|mkv)$/i.test(name)) return FileVideoIcon
  if (/\.(txt|md|pdf|docx?|rtf|csv|json|xml|html?)$/i.test(name)) return FileTextIcon
  return File01Icon
}

function canPreview(name: string) { return /\.(png|jpe?g|gif|webp|svg|avif|pdf|txt|md|csv|json)$/i.test(name) }

export function FileExplorer({ connectionId, prefix, listing, tree }: { connectionId: string; prefix: string; listing: Listing; tree: ExplorerFolder[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [sort, setSort] = useState<Sort>("name")
  const [selected, setSelected] = useState<string | null>(null)
  const [operation, setOperation] = useState<Operation>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<{ key: string; mode: "copy" | "cut" } | null>(null)
  const [pasteError, setPasteError] = useState("")
  const [pasting, setPasting] = useState(false)
  const path = `/media/${connectionId}`
  const href = (folder: string) => folder ? `${path}?prefix=${encodeURIComponent(folder)}` : path
  const download = (key: string) => `${path}/download?key=${encodeURIComponent(key)}`
  const parts = prefix.split("/").filter(Boolean)
  const parentPrefix = parts.length > 1 ? `${parts.slice(0, -1).join("/")}/` : ""
  const items = useMemo<Item[]>(() => {
    const normalized = query.trim().toLocaleLowerCase()
    const results: Item[] = [...listing.folders.map((folder) => ({ kind: "folder" as const, ...folder })), ...listing.files.map((file) => ({ kind: "file" as const, ...file }))].filter((item) => item.name.toLocaleLowerCase().includes(normalized))
    results.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1
      if (sort === "newest" && a.kind === "file" && b.kind === "file") return b.modified.localeCompare(a.modified) || a.name.localeCompare(b.name)
      if (sort === "size" && a.kind === "file" && b.kind === "file") return b.size - a.size || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    })
    return results
  }, [listing, query, sort])
  const selectedItem = items.find((item) => (item.kind === "folder" ? item.prefix : item.key) === selected) ?? null
  const previewItem = listing.files.find((file) => file.key === preview)
  const currentName = parts.at(-1) ?? "My files"

  function open(item: Item) {
    if (item.kind === "folder") router.push(href(item.prefix))
    else if (canPreview(item.name)) setPreview(item.key)
    else window.open(download(item.key), "_blank", "noopener,noreferrer")
  }

  async function paste() {
    if (!clipboard || pasting) return
    const data = new FormData()
    data.set("connectionId", connectionId)
    data.set("prefix", prefix)
    data.set("key", clipboard.key)
    data.set("mode", clipboard.mode)
    setPasting(true)
    setPasteError("")
    const result = await pasteBucketFileAction(data)
    setPasting(false)
    if (result.error) setPasteError(result.error)
    else { if (clipboard.mode === "cut") setClipboard(null); router.refresh() }
  }

  return <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
      <div className="relative min-w-48 flex-1 sm:max-w-lg"><HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search this folder" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this folder" className="pl-9" /></div>
      <Select value={sort} onValueChange={(value) => setSort(value as Sort)} items={[{ label: "Name", value: "name" }, { label: "Newest", value: "newest" }, { label: "Size", value: "size" }]}><SelectTrigger aria-label="Sort files" className="border-border bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Name</SelectItem><SelectItem value="newest">Newest</SelectItem><SelectItem value="size">Size</SelectItem></SelectContent></Select>
      <div className="flex rounded-full border p-0.5" role="group" aria-label="View mode"><Button size="icon-sm" variant={view === "grid" ? "secondary" : "ghost"} aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><HugeiconsIcon icon={GridViewIcon} /></Button><Button size="icon-sm" variant={view === "list" ? "secondary" : "ghost"} aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><HugeiconsIcon icon={ListIcon} /></Button></div>
      {clipboard && <Button size="sm" variant="outline" disabled={pasting} onClick={paste}><HugeiconsIcon icon={ClipboardPasteIcon} /> {pasting ? "Pasting…" : "Paste here"}</Button>}
      <Button size="icon-sm" variant="ghost" aria-label="Refresh files" onClick={() => router.refresh()}><HugeiconsIcon icon={Refresh01Icon} /></Button>
    </div>
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-1">
      <aside className="flex max-h-44 min-h-0 min-w-0 flex-col border-b bg-muted/20 p-3 md:max-h-none md:border-b-0 md:border-r">
        <DropdownMenu><DropdownMenuTrigger render={<Button className="w-full justify-start" />}><HugeiconsIcon icon={Add01Icon} /> Add new</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuItem onClick={() => setOperation("create")}><HugeiconsIcon icon={Folder01Icon} /> New folder</DropdownMenuItem><DropdownMenuItem onClick={() => setOperation("upload")}><HugeiconsIcon icon={Upload01Icon} /> Upload file</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
        <nav className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-auto" aria-label="Folder tree"><Link href={path} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${!prefix ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}><HugeiconsIcon icon={Folder01Icon} className="size-4" /> My files</Link>{tree.map((folder) => <Link key={folder.prefix} href={href(folder.prefix)} title={folder.prefix} style={{ paddingLeft: `${16 + folder.depth * 15}px` }} className={`flex items-center gap-2 truncate rounded-xl py-2 pr-2 text-sm ${folder.prefix === prefix ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}><HugeiconsIcon icon={Folder01Icon} className="size-4 shrink-0" /><span className="truncate">{folder.name}</span></Link>)}</nav>
        <p className="mt-3 shrink-0 border-t px-3 pt-3 text-xs text-muted-foreground">S3 storage · {listing.folders.length + listing.files.length}{listing.nextCursor ? "+" : ""} items in this folder</p>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6"><div className="flex min-w-0 items-center gap-2"><Link href={href(parentPrefix)} aria-label="Parent folder" className={`rounded-full p-2 hover:bg-muted ${!prefix ? "pointer-events-none opacity-30" : ""}`}><HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" /></Link><nav aria-label="Bucket path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm"><Link href={path} className="text-muted-foreground hover:text-foreground">My files</Link>{parts.map((part, index) => <span key={index} className="flex min-w-0 items-center gap-1"><span className="text-muted-foreground">/</span><Link href={href(`${parts.slice(0, index + 1).join("/")}/`)} className={`min-w-0 break-all ${index === parts.length - 1 ? "font-semibold" : "text-muted-foreground hover:text-foreground"}`}>{part}</Link></span>)}</nav></div><span className="text-xs text-muted-foreground">{items.length} shown{listing.nextCursor ? " · more on next page" : ""}</span></div>
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-5 sm:px-6"><div className="min-w-0"><h2 className="truncate text-xl font-semibold">{currentName}</h2><p className="text-xs text-muted-foreground">Select an item for details. Double-click to open.</p></div>{selectedItem && <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Clear selection</Button>}</div>
        {pasteError && <p role="alert" className="mx-6 mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{pasteError}</p>}
        <div className="min-h-0 flex-1 overflow-y-auto">{items.length ? <div className={view === "grid" ? "grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6 xl:grid-cols-4" : "space-y-1 p-4 sm:p-6"}>{items.map((item) => { const id = item.kind === "folder" ? item.prefix : item.key; const active = selected === id; return <div key={id} onClick={() => setSelected(id)} onDoubleClick={() => open(item)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") open(item) }} role="button" aria-label={`${item.kind === "folder" ? "Folder" : "File"}: ${item.name}`} aria-pressed={active} className={`group relative cursor-pointer rounded-xl border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary/5" : "bg-background hover:border-primary/40 hover:bg-muted/30"} ${view === "grid" ? "min-h-44 p-3" : "flex items-center gap-3 px-3 py-2"}`}>
          <div className={view === "grid" ? "flex h-28 items-center justify-center rounded-lg bg-muted/30" : "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40"}><HugeiconsIcon icon={item.kind === "folder" ? Folder01Icon : fileIcon(item.name)} className={view === "grid" ? `size-16 ${item.kind === "folder" ? "text-primary" : "text-muted-foreground"}` : `size-6 ${item.kind === "folder" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.3} /></div>
          <div className={`min-w-0 flex-1 pr-8 ${view === "grid" ? "mt-3" : ""}`}><p className="truncate text-sm font-medium" title={item.name}>{item.name}</p><p className="truncate text-xs text-muted-foreground">{item.kind === "folder" ? "Folder" : `${bytes(item.size)}${item.modified ? ` · ${new Date(item.modified).toLocaleDateString()}` : ""}`}</p></div>
          <div className="absolute bottom-3 right-2" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Actions for ${item.name}`} />}><HugeiconsIcon icon={MoreVerticalIcon} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onClick={() => open(item)}>{item.kind === "folder" ? <HugeiconsIcon icon={Folder01Icon} /> : <HugeiconsIcon icon={InformationCircleIcon} />}{item.kind === "folder" ? "Open folder" : canPreview(item.name) ? "Preview" : "Open file"}</DropdownMenuItem>{item.kind === "file" && <><DropdownMenuItem render={<a href={download(item.key)} target="_blank" rel="noreferrer" />}><HugeiconsIcon icon={Download01Icon} /> Download</DropdownMenuItem><DropdownMenuItem onClick={() => { setClipboard({ key: item.key, mode: "copy" }); setPasteError("") }}><HugeiconsIcon icon={Copy01Icon} /> Copy</DropdownMenuItem><DropdownMenuItem onClick={() => { setClipboard({ key: item.key, mode: "cut" }); setPasteError("") }}><HugeiconsIcon icon={Scissor01Icon} /> Cut</DropdownMenuItem><DropdownMenuItem onClick={() => { setSelected(id); setOperation("rename") }}><HugeiconsIcon icon={Edit01Icon} /> Rename</DropdownMenuItem></>}<DropdownMenuItem variant="destructive" onClick={() => { setSelected(id); setOperation("delete") }}><HugeiconsIcon icon={Delete01Icon} /> {item.kind === "folder" ? "Delete empty folder" : "Delete"}</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div>
        </div> })}</div> : <div className="m-6 rounded-xl border border-dashed p-12 text-center"><HugeiconsIcon icon={query ? Search01Icon : Folder01Icon} className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 font-medium">{query ? "No matching items" : "This folder is empty"}</p><p className="mt-1 text-sm text-muted-foreground">{query ? "Try another search in this folder." : "Add a folder or upload a file to get started."}</p></div>}
        {listing.nextCursor && <div className="border-t p-4 text-center"><Link href={`${href(prefix)}${prefix ? "&" : "?"}cursor=${encodeURIComponent(listing.nextCursor)}`} className="text-sm font-medium text-primary hover:underline">Next page →</Link></div>}
        </div>{selectedItem && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3 text-sm sm:px-6"><div className="min-w-0"><strong className="block max-w-full truncate">{selectedItem.name}</strong><span className="text-muted-foreground">{selectedItem.kind === "file" ? `${bytes(selectedItem.size)}${selectedItem.mediaId ? " · CMS media" : " · bucket object"}` : "Folder"}</span></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => open(selectedItem)}>Open</Button>{selectedItem.kind === "file" && <Button size="sm" variant="outline" onClick={() => setOperation("rename")}>Rename</Button>}<Button size="sm" variant="destructive" onClick={() => setOperation("delete")}>Delete</Button></div></div>}
      </section>
    </div>
    <ActionDialog key={`${operation}-${selected ?? ""}-${prefix}`} operation={operation} onClose={() => setOperation(null)} item={selectedItem} connectionId={connectionId} prefix={prefix} onDone={() => { setOperation(null); setSelected(null); router.refresh() }} />
    <Dialog open={Boolean(previewItem)} onOpenChange={(open) => { if (!open) setPreview(null) }}><DialogContent className="max-h-[90vh] sm:max-w-4xl"><DialogHeader><DialogTitle>{previewItem?.name ?? "Preview"}</DialogTitle><DialogDescription>Preview from this S3 bucket</DialogDescription></DialogHeader>{previewItem && <iframe title={`Preview ${previewItem.name}`} src={download(previewItem.key)} className="h-[65vh] w-full rounded-xl border bg-background" />}<DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>Close</Button>{previewItem && <a href={download(previewItem.key)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground">Open original</a>}</DialogFooter></DialogContent></Dialog>
  </div>
}

function ActionDialog({ operation, onClose, onDone, item, connectionId, prefix }: { operation: Operation; onClose: () => void; onDone: () => void; item: Item | null; connectionId: string; prefix: string }) {
  const action = operation === "create" ? createFolderAction : operation === "upload" ? uploadBucketAction : operation === "rename" ? renameBucketFileAction : item?.kind === "folder" ? deleteBucketFolderAction : deleteBucketFileAction
  const [state, submit, pending] = useActionState(async (previous: BucketState, data: FormData) => { const result = await action(previous, data); if (result.success) onDone(); return result }, {} as BucketState)
  const title = operation === "create" ? "New folder" : operation === "upload" ? "Upload file" : operation === "rename" ? `Rename ${item?.name ?? "file"}` : `Delete ${item?.name ?? "item"}`
  return <Dialog open={Boolean(operation)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{operation === "delete" ? item?.kind === "folder" ? "Only empty folders can be deleted. This action cannot be undone." : "This file will be removed from the bucket. Files used by content cannot be deleted." : operation === "upload" ? "Upload one file up to 10 MB to this folder." : operation === "rename" ? "The file keeps its CMS media reference." : "Create a folder in the current location."}</DialogDescription></DialogHeader><form action={submit} className="space-y-4"><input type="hidden" name="connectionId" value={connectionId} /><input type="hidden" name="prefix" value={prefix} />{item?.kind === "file" && <input type="hidden" name="key" value={item.key} />}{item?.kind === "folder" && <input type="hidden" name="folder" value={item.prefix} />}{operation === "upload" ? <Field><FieldLabel htmlFor="explorer-upload">File</FieldLabel><Input id="explorer-upload" name="file" type="file" required /></Field> : operation === "create" || operation === "rename" ? <Field><FieldLabel htmlFor="explorer-name">Name</FieldLabel><Input id="explorer-name" name="name" defaultValue={operation === "rename" ? item?.name : ""} autoFocus required /></Field> : null}{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending} variant={operation === "delete" ? "destructive" : "default"}>{pending ? "Working…" : operation === "create" ? "Create folder" : operation === "upload" ? "Upload" : operation === "rename" ? "Save name" : "Delete"}</Button></DialogFooter></form></DialogContent></Dialog>
}
