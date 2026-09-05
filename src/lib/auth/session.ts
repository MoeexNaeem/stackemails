import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/connect";
import { Session, User, type UserDoc } from "@/lib/db/models";
import { sha256 } from "@/lib/crypto";

const COOKIE_NAME = "nanosend_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Create a session row + set the httpOnly cookie. Returns the raw token. */
export async function createSession(userId: string, userAgent?: string): Promise<void> {
  await connectToDatabase();
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await Session.create({
    userId,
    tokenHash: sha256(raw),
    expiresAt,
    userAgent,
  });

  const store = await cookies();
  store.set(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolve the currently authenticated user from the session cookie. */
export async function getCurrentUser(): Promise<UserDoc | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  await connectToDatabase();
  const session = await Session.findOne({ tokenHash: sha256(raw) });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await session.deleteOne();
    return null;
  }
  return User.findById(session.userId);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (raw) {
    await connectToDatabase();
    await Session.deleteOne({ tokenHash: sha256(raw) });
  }
  store.delete(COOKIE_NAME);
}
