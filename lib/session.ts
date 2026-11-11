import "server-only"

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { cookies } from "next/headers"

const cookieName = "yacms_session"
const sessionLength = 7 * 24 * 60 * 60 * 1000
const dataDirectory = path.join(process.cwd(), "data")
const secretFile = path.join(dataDirectory, ".session-secret")

type SessionPayload = {
  userId: string
  expiresAt: number
}

let secretPromise: Promise<Buffer> | undefined

async function loadSecret() {
  if (process.env.SESSION_SECRET) {
    return Buffer.from(process.env.SESSION_SECRET)
  }

  try {
    return await readFile(secretFile)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error

    await mkdir(dataDirectory, { recursive: true })
    const generatedSecret = randomBytes(32)
    try {
      await writeFile(secretFile, generatedSecret, { flag: "wx", mode: 0o600 })
      return generatedSecret
    } catch (writeError) {
      if ((writeError as NodeJS.ErrnoException).code === "EEXIST") {
        return readFile(secretFile)
      }
      throw writeError
    }
  }
}

function getSecret() {
  secretPromise ??= loadSecret()
  return secretPromise
}

async function sign(value: string) {
  return createHmac("sha256", await getSecret()).update(value).digest("base64url")
}

async function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encodedPayload}.${await sign(encodedPayload)}`
}

async function decodeSession(value?: string): Promise<SessionPayload | null> {
  if (!value) return null
  const [encodedPayload, suppliedSignature] = value.split(".")
  if (!encodedPayload || !suppliedSignature) return null

  const expectedSignature = await sign(encodedPayload)
  const supplied = Buffer.from(suppliedSignature)
  const expected = Buffer.from(expectedSignature)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionPayload

    if (
      typeof payload.userId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function createSession(userId: string) {
  const expiresAt = Date.now() + sessionLength
  const value = await encodeSession({ userId, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set(cookieName, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  })
}

export async function readSession() {
  const value = (await cookies()).get(cookieName)?.value
  return decodeSession(value)
}

export async function deleteSession() {
  ;(await cookies()).delete(cookieName)
}
