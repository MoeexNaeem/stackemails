import { after } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog } from "@/lib/db/models";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { bumpStat } from "@/lib/stats";
import { verifyClick } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed click redirect. Unsigned/tampered URLs are refused (no open redirect). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const target = url.searchParams.get("u") ?? "";
  const sig = url.searchParams.get("s") ?? "";

  let dest: URL | null = null;
  try {
    dest = new URL(target);
  } catch {
    dest = null;
  }
  if (!dest || !/^https?:$/.test(dest.protocol) || !verifyClick(id, target, sig)) {
    return new Response("Invalid link", { status: 400 });
  }

  after(async () => {
    await connectToDatabase();
    {
      const log = await EmailLog.findOneAndUpdate({ messageId: id }, { $inc: { clicks: 1 } }, { new: false }).select("workspaceId clicks messageId to subject from").lean();
      if (log && (log.clicks ?? 0) === 0) {
        await EmailLog.updateOne({ _id: log._id }, { $set: { clickedAt: new Date() }, $push: { events: { type: "clicked", at: new Date(), detail: target.slice(0, 500) } } });
        await bumpStat(log.workspaceId, log.from, { clicked: 1 });
      }
      if (log) await emitEvent(String(log.workspaceId), "email.clicked", { email_id: log.messageId, to: log.to, link: target });
    }
  });

  return Response.redirect(dest.toString(), 302);
}
