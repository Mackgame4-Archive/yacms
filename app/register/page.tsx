import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth-form"
import { AuthShell } from "@/components/auth-shell"
import { getCurrentUser } from "@/lib/auth"

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/")

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Set up your private workspace in less than a minute."
    >
      <AuthForm mode="register" />
    </AuthShell>
  )
}
