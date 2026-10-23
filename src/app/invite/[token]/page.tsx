import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db/connect";
import { Invitation, Membership, Workspace } from "@/lib/db/models";
import { getCurrentUser } from "@/lib/auth/session";
import { ACTIVE_WS_COOKIE } from "@/lib/auth/workspace";
import { sha256 } from "@/lib/crypto";
import { LogoMark } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team invitation", robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await connectToDatabase();
  const invite = /^[a-f0-9]{64}$/.test(token) ? await Invitation.findOne({ tokenHash: sha256(token), acceptedAt: { $exists: false }, expiresAt: { $gt: new Date() } }) : null;
  const team = invite ? await Workspace.findById(invite.workspaceId).select("name").lean() : null;
  const user = await getCurrentUser();

  async function accept() {
    "use server";
    const u = await getCurrentUser();
    if (!u) redirect(`/login?next=/invite/${token}`);
    await connectToDatabase();
    const inv = await Invitation.findOne({ tokenHash: sha256(token), acceptedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
    if (!inv) redirect(`/invite/${token}`);
    if (inv.email !== u.email) redirect(`/invite/${token}?mismatch=1`);
    await Membership.updateOne({ workspaceId: inv.workspaceId, userId: u._id }, { $setOnInsert: { role: inv.role } }, { upsert: true });
    inv.acceptedAt = new Date();
    await inv.save();
    (await cookies()).set(ACTIVE_WS_COOKIE, String(inv.workspaceId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31_536_000 });
    redirect("/overview");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 w-fit"><LogoMark size={40} /></div>
        {!invite || !team ? (
          <>
            <h1 className="text-xl font-medium">This invitation isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-fg-muted">It may have expired, been revoked or already been used. Ask a team admin to invite you again.</p>
            <Link href="/" className="btn btn-secondary mt-6">Go home</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium">Join {team.name}</h1>
            <p className="mt-2 text-sm text-fg-muted">You&apos;ve been invited as {invite.role === "admin" ? "an admin" : "a member"} ({invite.email}).</p>
            {user && user.email !== invite.email ? (
              <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={{ color: "var(--warning)", background: "color-mix(in srgb, var(--warning) 10%, transparent)" }}>
                You&apos;re signed in as {user.email}. Sign in as {invite.email} to accept.
              </p>
            ) : null}
            {user ? (
              user.email === invite.email && (
                <form action={accept} className="mt-6">
                  <button className="btn btn-primary w-full">Accept invitation</button>
                </form>
              )
            ) : (
              <div className="mt-6 grid gap-2">
                <Link href={`/login?next=/invite/${token}`} className="btn btn-primary">Sign in to accept</Link>
                <Link href={`/signup?next=/invite/${token}`} className="btn btn-secondary">Create an account</Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
