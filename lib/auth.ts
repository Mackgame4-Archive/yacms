import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { connectDatabase } from "./db";
import { Session, User, WebsiteMembership, objectId } from "./models";
import { hashToken, isSessionActive, randomToken } from "./security";

const COOKIE = "forte_cms_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 14;

export type Viewer = { id: string; email: string; name: string; isPlatformAdmin: boolean };

export async function createSession(userId: string) {
  await connectDatabase();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await Session.create({ userId: objectId(userId), tokenHash: hashToken(token), expiresAt });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", expires: expiresAt });
}

export async function getViewer(): Promise<Viewer | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !process.env.MONGODB_URI) return null;
  await connection();
  await connectDatabase();
  const session = await Session.findOne({ tokenHash: hashToken(token) }).select("+tokenHash userId expiresAt").lean();
  if (!session || !isSessionActive(session.expiresAt)) return null;
  const user = await User.findById(session.userId).select("email name isPlatformAdmin").lean();
  return user ? { id: String(user._id), email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin } : null;
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function revokeCurrentSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token && process.env.MONGODB_URI) { await connectDatabase(); await Session.deleteOne({ tokenHash: hashToken(token) }); }
  store.delete(COOKIE);
}

export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new Error("Invalid request origin");
}

export async function authorizeWebsite(websiteId: string, minimum: "editor" | "administrator" = "editor") {
  const viewer = await requireViewer();
  const id = objectId(websiteId);
  if (viewer.isPlatformAdmin) return { viewer, websiteId: id, role: "platform" as const };
  await connectDatabase();
  const membership = await WebsiteMembership.findOne({ userId: objectId(viewer.id), websiteId: id }).lean();
  if (!membership || (minimum === "administrator" && membership.role !== "administrator")) throw new Error("Forbidden");
  return { viewer, websiteId: id, role: membership.role as "editor" | "administrator" };
}
