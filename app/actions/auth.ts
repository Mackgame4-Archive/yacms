"use server"

import { redirect } from "next/navigation"

import { createSession, deleteSession } from "@/lib/session"
import { authenticateUser, createUser } from "@/lib/user-store"

export type AuthFormState = {
  error?: string
  fields?: {
    name?: string
    email?: string
  }
}

function text(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function login(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = text(formData, "email").toLowerCase()
  const password = text(formData, "password")
  const fields = { email }

  if (!validEmail(email) || !password) {
    return { error: "Enter a valid email and password.", fields }
  }

  const user = await authenticateUser(email, password)
  if (!user) return { error: "Email or password is incorrect.", fields }

  await createSession(user.id)
  redirect("/")
}

export async function register(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = text(formData, "name")
  const email = text(formData, "email").toLowerCase()
  const password = text(formData, "password")
  const confirmPassword = text(formData, "confirmPassword")
  const fields = { name, email }

  if (name.length < 2 || name.length > 60) {
    return { error: "Name must be between 2 and 60 characters.", fields }
  }
  if (!validEmail(email)) {
    return { error: "Enter a valid email address.", fields }
  }
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      error: "Password must have at least 8 characters, one letter, and one number.",
      fields,
    }
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", fields }
  }

  const user = await createUser({ name, email, password })
  if (!user) return { error: "An account with this email already exists.", fields }

  await createSession(user.id)
  redirect("/")
}

export async function logout() {
  await deleteSession()
  redirect("/login")
}
