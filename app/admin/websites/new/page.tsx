import { requireViewer } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { createWebsiteAction } from "@/app/actions";
export default async function NewWebsite() { const viewer = await requireViewer(); if (!viewer.isPlatformAdmin) redirect("/admin"); return <div className="page narrow"><header className="page-header"><div><p className="eyebrow">Platform administration</p><h1>Add website</h1></div></header><section className="panel"><ActionForm action={createWebsiteAction} submitLabel="Create website"><label>Name<input name="name" required /></label><label>Slug<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>Public URL<input name="publicUrl" type="url" required /></label><label>Content type<input name="type" defaultValue="structured" required /></label></ActionForm></section></div>; }
