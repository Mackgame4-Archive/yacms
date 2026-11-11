import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { Types } from "mongoose"
import { cookies } from "next/headers"

import { dbConnect } from "@/lib/mongodb"
import { SessionModel } from "@/lib/models/session"

const cookieName = "yacms_session_v1"
const defaultSessionDays = 7

function sessionDuration() {
  const configuredDays = Number(process.env.SESSION_TTL_DAYS || defaultSessionDays)
  const days =
    Number.isFinite(configuredDays) && configuredDays > 0
      ? configuredDays
      : defaultSessionDays
  return days * 24 * 60 * 60 * 1000
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64url")
}

function shouldUseSecureCookies() {
  if (process.env.COOKIE_SECURE === "false") return false
  if (process.env.COOKIE_SECURE === "true") return true
  return process.env.NODE_ENV === "production"
}

export async function createSession(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Cannot create a session for an invalid user.")
  }

  await dbConnect()
  await SessionModel.init()

  const cookieStore = await cookies()
  const previousToken = cookieStore.get(cookieName)?.value

  if (previousToken) {
    await SessionModel.deleteOne({ tokenHash: tokenHash(previousToken) })
  }

  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + sessionDuration())

  await SessionModel.create({
    tokenHash: tokenHash(token),
    userId: new Types.ObjectId(userId),
    expiresAt,
  })

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  })
}

export async function readSession() {
  const token = (await cookies()).get(cookieName)?.value
  if (!token) return null

  await dbConnect()
  const session = await SessionModel.findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  }).exec()

  return session ? { userId: session.userId.toString() } : null
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(cookieName)?.value
  cookieStore.delete(cookieName)

  if (token) {
    await dbConnect()
    await SessionModel.deleteOne({ tokenHash: tokenHash(token) })
  }
}
