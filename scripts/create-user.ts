import mongoose from "mongoose";
import { Session, User } from "../lib/models";
import { hashPassword } from "../lib/security";
async function main() {
  const values = process.argv.slice(2); const read = (name: string) => { const i = values.indexOf(`--${name}`); return i >= 0 ? values[i + 1] : undefined; };
  const email = read("email")?.toLowerCase(), name = read("name"), password = read("password");
  if (!process.env.MONGODB_URI || !email || !name || !password || password.length < 12) throw new Error("Usage: MONGODB_URI=... npm run user:create -- --email editor@example.com --name 'Editor' --password 'at-least-12-characters'");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || undefined });
  const existing = await User.findOne({ email }); const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate({ email }, { $set: { name, passwordHash, passwordChangedAt: new Date() }, $setOnInsert: { isPlatformAdmin: false } }, { upsert: true, new: true });
  if (existing) await Session.deleteMany({ userId: user._id });
  console.log(`CMS user ready: ${user.email}. Existing sessions were revoked.`); await mongoose.disconnect();
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
