import "server-only"

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { Types } from "mongoose"

import { dbConnect } from "@/lib/mongodb"
import { UserModel, type UserDocument } from "@/lib/models/user"

const scrypt = promisify(scryptCallback)

export type SafeUser = {
  id: string
  name: string
  email: string
  createdAt: Date
}

function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  }
}

function normalizeEmail(email: string) {
  return email.normalize("NFKC").trim().toLowerCase()
}

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`
}

async function passwordMatches(password: string, storedHash: string) {
  const [algorithm, saltValue, keyValue] = storedHash.split("$")
  if (algorithm !== "scrypt" || !saltValue || !keyValue) return false

  try {
    const salt = Buffer.from(saltValue, "base64url")
    const expectedKey = Buffer.from(keyValue, "base64url")
    const suppliedKey = (await scrypt(password, salt, expectedKey.length)) as Buffer
    return timingSafeEqual(expectedKey, suppliedKey)
  } catch {
    return false
  }
}

export async function createUser(input: {
  name: string
  email: string
  password: string
}): Promise<SafeUser | null> {
  await dbConnect()
  await UserModel.init()

  try {
    const user = await UserModel.create({
      name: input.name,
      email: normalizeEmail(input.email),
      passwordHash: await hashPassword(input.password),
    })
    return toSafeUser(user)
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return null
    throw error
  }
}

export async function authenticateUser(email: string, password: string) {
  await dbConnect()
  const user = await UserModel.findOne({ email: normalizeEmail(email) })
    .select("+passwordHash")
    .exec()

  if (!user) {
    // Keep unknown-account requests closer to the cost of a real password check.
    await scrypt(password, Buffer.alloc(16), 64)
    return null
  }

  if (!(await passwordMatches(password, user.passwordHash))) return null
  return toSafeUser(user)
}

export async function findUserById(id: string) {
  if (!Types.ObjectId.isValid(id)) return null
  await dbConnect()
  const user = await UserModel.findById(id).exec()
  return user ? toSafeUser(user) : null
}
