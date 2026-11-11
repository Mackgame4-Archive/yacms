import "server-only"

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const scrypt = promisify(scryptCallback)
const dataDirectory = path.join(process.cwd(), "data")
const usersFile = path.join(dataDirectory, "users.json")

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

export type SafeUser = Omit<User, "passwordHash">

let writeQueue: Promise<unknown> = Promise.resolve()

async function readUsers(): Promise<User[]> {
  try {
    const contents = await readFile(usersFile, "utf8")
    const users: unknown = JSON.parse(contents)
    return Array.isArray(users) ? (users as User[]) : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

async function writeUsers(users: User[]) {
  await mkdir(dataDirectory, { recursive: true })
  const temporaryFile = `${usersFile}.${process.pid}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(users, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  await rename(temporaryFile, usersFile)
}

function withoutPassword(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `${salt.toString("base64url")}.${derivedKey.toString("base64url")}`
}

async function passwordMatches(password: string, storedHash: string) {
  const [saltValue, keyValue] = storedHash.split(".")
  if (!saltValue || !keyValue) return false

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
  const operation = writeQueue.then(async () => {
    const users = await readUsers()
    const email = input.email.toLowerCase()

    if (users.some((user) => user.email === email)) return null

    const user: User = {
      id: randomBytes(16).toString("hex"),
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password),
      createdAt: new Date().toISOString(),
    }

    users.push(user)
    await writeUsers(users)
    return withoutPassword(user)
  })

  writeQueue = operation.catch(() => undefined)
  return operation
}

export async function authenticateUser(email: string, password: string) {
  const users = await readUsers()
  const user = users.find((candidate) => candidate.email === email.toLowerCase())
  if (!user || !(await passwordMatches(password, user.passwordHash))) return null
  return withoutPassword(user)
}

export async function findUserById(id: string) {
  const user = (await readUsers()).find((candidate) => candidate.id === id)
  return user ? withoutPassword(user) : null
}
