"use client";
import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
export function ActionForm({ action, children, submitLabel, className = "stack" }: { action: (state: ActionState, data: FormData) => Promise<ActionState>; children: React.ReactNode; submitLabel: string; className?: string }) { const [state, formAction, pending] = useActionState(action, {}); return <form action={formAction} className={className}>{children}{state.error && <p className="alert error" role="alert">{state.error}</p>}{state.success && <p className="alert success">{state.success}</p>}{state.secret && <output className="secret">{state.secret}</output>}<Button disabled={pending}>{pending ? "Working…" : submitLabel}</Button></form>; }
