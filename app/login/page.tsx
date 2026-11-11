import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth-form"
import { AuthShell } from "@/components/auth-shell"
import { getCurrentUser } from "@/lib/auth"

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/")

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your workspace"
      description="Enter your details to continue to your private dashboard."
    >
      <AuthForm mode="login" />
    </AuthShell>
  )
}
