import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { Suspense } from "react";
export const instant = false;
async function AuthenticatedShell({ children }: { children: React.ReactNode }) { const viewer = await requireViewer(); return <div className="admin-shell"><aside className="sidebar"><Link href="/admin" className="logo"><span>F</span><strong>Forte CMS</strong></Link><nav><Link href="/admin">Websites</Link>{viewer.isPlatformAdmin && <Link href="/admin/websites/new">Add website</Link>}</nav><div className="sidebar-user"><strong>{viewer.name}</strong><span>{viewer.email}</span><form action={logoutAction}><button className="link-button">Sign out</button></form></div></aside><main className="admin-main">{children}</main></div>; }
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <Suspense fallback={<div className="page"><div className="skeleton wide"/><div className="skeleton"/></div>}><AuthenticatedShell>{children}</AuthenticatedShell></Suspense>; }
