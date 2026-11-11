import { getViewer } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Suspense } from "react";
export const instant = false;
async function LoginContent() { if (await getViewer()) redirect("/admin"); return <main className="auth-page"><section className="auth-card"><div className="brand-mark">F</div><p className="eyebrow">Forte CMS</p><h1>Welcome back</h1><p className="muted">Sign in to manage your websites and published content.</p>{process.env.NODE_ENV !== "production" && <div className="alert success"><strong>Local administrator</strong><br/>admin@localhost.test<br/>admin-local-2026</div>}<ActionForm action={loginAction} submitLabel="Sign in"><label>Email<input name="email" type="email" autoComplete="email" defaultValue={process.env.NODE_ENV !== "production" ? "admin@localhost.test" : ""} required /></label><label>Password<input name="password" type="password" autoComplete="current-password" defaultValue={process.env.NODE_ENV !== "production" ? "admin-local-2026" : ""} required /></label></ActionForm></section></main>; }
export default function LoginPage() { return <Suspense fallback={<main className="auth-page"><section className="auth-card"><div className="skeleton wide"/><div className="skeleton"/></section></main>}><LoginContent/></Suspense>; }
