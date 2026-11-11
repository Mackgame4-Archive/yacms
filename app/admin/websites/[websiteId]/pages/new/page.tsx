import { authorizeWebsite } from "@/lib/auth";
import { PageEditor } from "@/components/page-editor";
export default async function NewPage({ params }: { params: Promise<{ websiteId: string }> }) { const { websiteId } = await params; await authorizeWebsite(websiteId); return <div className="page"><header className="page-header"><div><p className="eyebrow">New content</p><h1>Add page</h1></div></header><section className="panel"><PageEditor websiteId={websiteId}/></section></div>; }
