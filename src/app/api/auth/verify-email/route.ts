import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { readVerifyToken } from "@/lib/auth/emailVerify";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/verify-email?token=... - the link in the confirmation email.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const data = readVerifyToken(token);
  const go = (path: string) => NextResponse.redirect(new URL(path, env.appUrl), 303);
  if (!data || !isValidObjectId(data.userId)) return go("/overview?verify=invalid");

  await connectToDatabase();
  // The token is bound to the address it was sent to, so changing the email invalidates old links.
  const res = await User.updateOne(
    { _id: data.userId, email: data.email.toLowerCase(), disabled: { $ne: true } },
    { $set: { emailVerifiedAt: new Date() } },
  );
  return go(res.matchedCount ? "/overview?verify=done" : "/overview?verify=invalid");
}
