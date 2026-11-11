import mongoose from "mongoose";
import { Session, User } from "../lib/models";
import { hashPassword } from "../lib/security";

async function main() {
  const args = new Map(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value.slice(2), all[index + 1]] : ["", ""]));
  const email = args.get("email")?.toLowerCase(); const name = args.get("name"); const password = args.get("password");
  if (!process.env.MONGODB_URI || !email || !name || !password || password.length < 12) throw new Error("Usage: MONGODB_URI=... npm run admin:create -- --email admin@example.com --name 'Admin' --password 'at-least-12-characters'");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || undefined });
  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate({ email }, { $set: { name, passwordHash, isPlatformAdmin: true, passwordChangedAt: new Date() } }, { upsert: true, new: true });
  await Session.deleteMany({ userId: user._id });
  console.log(`Platform administrator ready: ${user.email}`);
  await mongoose.disconnect();
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
