import "server-only";
import mongoose from "mongoose";

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
};

export function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required at runtime");
  globalForMongoose.mongooseConnection ??= mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || undefined,
  });
  return globalForMongoose.mongooseConnection;
}
