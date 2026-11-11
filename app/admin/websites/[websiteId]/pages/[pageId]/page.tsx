import { authorizeWebsite } from "@/lib/auth";
import { Page, objectId } from "@/lib/models";
import { PageEditor } from "@/components/page-editor";
import { notFound } from "next/navigation";
export default async function EditPage({ params }: { params: Promise<{ websiteId: string; pageId: string }> }) { const { websiteId, pageId } = await params; const access = await authorizeWebsite(websiteId); const page = await Page.findOne({ _id: objectId(pageId), websiteId: access.websiteId }).lean(); if (!page) notFound(); return <div className="page"><header className="page-header"><div><p className="eyebrow">Draft editor</p><h1>{page.title}</h1><p className="muted">Last updated {new Date(page.updatedAt).toLocaleString()}</p></div></header><section className="panel"><PageEditor websiteId={websiteId} value={page}/></section></div>; }
