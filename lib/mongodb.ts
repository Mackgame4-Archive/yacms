import "server-only"

import mongoose, { type Mongoose } from "mongoose"

type MongooseCache = {
  connection: Mongoose | null
  promise: Promise<Mongoose> | null
}

declare global {
  var yacmsMongoose: MongooseCache | undefined
}

const cached = globalThis.yacmsMongoose ?? {
  connection: null,
  promise: null,
}

globalThis.yacmsMongoose = cached

export async function dbConnect() {
  if (cached.connection) return cached.connection

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Copy .env.example to .env.local or use Docker Compose."
    )
  }

  cached.promise ??= mongoose
    .connect(uri, {
      dbName: process.env.MONGODB_DB || "yacms",
      serverSelectionTimeoutMS: 5_000,
    })
    .catch((error) => {
      cached.promise = null
      throw error
    })

  cached.connection = await cached.promise
  return cached.connection
}
