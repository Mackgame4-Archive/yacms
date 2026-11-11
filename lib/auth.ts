import "server-only"

import { cache } from "react"
import { redirect, unstable_rethrow } from "next/navigation"

import { readSession } from "@/lib/session"
import { findUserById } from "@/lib/users"

export const getCurrentUser = cache(async () => {
  try {
    const session = await readSession()
    if (!session) return null
    return findUserById(session.userId)
  } catch (error) {
    unstable_rethrow(error)
    console.error("Unable to read the current session", error)
    return null
  }
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}
