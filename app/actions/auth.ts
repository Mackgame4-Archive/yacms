"use server"

import { redirect } from "next/navigation"

import { createSession, deleteSession } from "@/lib/session"
import { authenticateUser, createUser } from "@/lib/users"

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

function rawText(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value : ""
}

function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function login(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = text(formData, "email").toLowerCase()
  const password = rawText(formData, "password")
  const fields = { email }

  if (!validEmail(email) || !password || password.length > 128) {
    return { error: "Enter a valid email and password.", fields }
  }

  let user
  try {
    user = await authenticateUser(email, password)
    if (user) await createSession(user.id)
  } catch (error) {
    console.error("Login failed", error)
    return { error: "Login is temporarily unavailable. Please try again.", fields }
  }

  if (!user) return { error: "Email or password is incorrect.", fields }
  redirect("/")
}

export async function register(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = text(formData, "name")
  const email = text(formData, "email").toLowerCase()
  const password = rawText(formData, "password")
  const confirmPassword = rawText(formData, "confirmPassword")
  const fields = { name, email }

  if (name.length < 2 || name.length > 60) {
    return { error: "Name must be between 2 and 60 characters.", fields }
  }
  if (!validEmail(email)) {
    return { error: "Enter a valid email address.", fields }
  }
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[a-zA-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return {
      error: "Password must have 8–128 characters, one letter, and one number.",
      fields,
    }
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", fields }
  }

  let user
  try {
    user = await createUser({ name, email, password })
    if (user) await createSession(user.id)
  } catch (error) {
    console.error("Registration failed", error)
    return {
      error: "Registration is temporarily unavailable. Please try again.",
      fields,
    }
  }

  if (!user) return { error: "An account with this email already exists.", fields }

  redirect("/")
}

export async function logout() {
  try {
    await deleteSession()
  } catch (error) {
    console.error("Session cleanup failed", error)
  }
  redirect("/login")
}
