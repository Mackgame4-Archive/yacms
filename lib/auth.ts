import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { readSession } from "@/lib/session"
import { findUserById } from "@/lib/user-store"

export const getCurrentUser = cache(async () => {
  const session = await readSession()
  if (!session) return null
  return findUserById(session.userId)
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}
