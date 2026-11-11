"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { createSession, deleteUserSessions } from "@/lib/session"
import { updateUserPassword, updateUserProfile } from "@/lib/users"

export type ProfileFormState = {
  status?: "error" | "success"
  message?: string
  fields?: {
    name?: string
    email?: string
  }
}

function trimmedText(formData: FormData, field: string) {
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

function validPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

export async function updateProfileAction(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser()
  const name = trimmedText(formData, "name")
  const email = trimmedText(formData, "email").toLowerCase()
  const currentPassword = rawText(formData, "currentPassword")
  const fields = { name, email }

  if (name.length < 2 || name.length > 60) {
    return {
      status: "error",
      message: "Name must be between 2 and 60 characters.",
      fields,
    }
  }
  if (!validEmail(email)) {
    return { status: "error", message: "Enter a valid email address.", fields }
  }
  if (!currentPassword || currentPassword.length > 128) {
    return {
      status: "error",
      message: "Enter your current password to save these changes.",
      fields,
    }
  }

  try {
    const result = await updateUserProfile({
      userId: user.id,
      name,
      email,
      currentPassword,
    })

    if (result === "invalid-password") {
      return { status: "error", message: "Current password is incorrect.", fields }
    }
    if (result === "email-taken") {
      return {
        status: "error",
        message: "An account with this email already exists.",
        fields,
      }
    }
    if (result === "not-found") {
      return { status: "error", message: "Your account could not be found.", fields }
    }
  } catch (error) {
    console.error("Profile update failed", error)
    return {
      status: "error",
      message: "Profile updates are temporarily unavailable. Please try again.",
      fields,
    }
  }

  revalidatePath("/")
  revalidatePath("/profile")
  return { status: "success", message: "Profile updated.", fields }
}

export async function updatePasswordAction(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser()
  const currentPassword = rawText(formData, "currentPassword")
  const newPassword = rawText(formData, "newPassword")
  const confirmPassword = rawText(formData, "confirmPassword")

  if (!currentPassword || currentPassword.length > 128) {
    return { status: "error", message: "Enter your current password." }
  }
  if (!validPassword(newPassword)) {
    return {
      status: "error",
      message: "New password must have 8–128 characters, one letter, and one number.",
    }
  }
  if (newPassword !== confirmPassword) {
    return { status: "error", message: "New passwords do not match." }
  }
  if (newPassword === currentPassword) {
    return { status: "error", message: "Choose a password you have not just used." }
  }

  try {
    const result = await updateUserPassword({
      userId: user.id,
      currentPassword,
      newPassword,
    })

    if (result === "invalid-password") {
      return { status: "error", message: "Current password is incorrect." }
    }
    if (result === "not-found") {
      return { status: "error", message: "Your account could not be found." }
    }

    await deleteUserSessions(user.id)
    await createSession(user.id)
  } catch (error) {
    console.error("Password update failed", error)
    return {
      status: "error",
      message: "Password updates are temporarily unavailable. Please try again.",
    }
  }

  return {
    status: "success",
    message: "Password updated. Other sessions have been signed out.",
  }
}
