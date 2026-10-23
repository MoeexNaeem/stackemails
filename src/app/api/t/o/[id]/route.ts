import { after } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog } from "@/lib/db/models";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { bumpStat } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1×1 transparent GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** Open-tracking pixel. Records the first open as an event, counts every open. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (/^msg_[a-z0-9]{10,40}$/.test(id)) {
    after(async () => {
      await connectToDatabase();
      {
        const log = await EmailLog.findOneAndUpdate({ messageId: id }, { $inc: { opens: 1 } }, { new: false }).select("workspaceId opens messageId to subject from").lean();
        if (log && (log.opens ?? 0) === 0) {
          await EmailLog.updateOne({ _id: log._id }, { $set: { openedAt: new Date() }, $push: { events: { type: "opened", at: new Date() } } });
          await bumpStat(log.workspaceId, log.from, { opened: 1 });
          await emitEvent(String(log.workspaceId), "email.opened", { email_id: log.messageId, to: log.to, subject: log.subject });
        }
      }
    });
  }
  return new Response(PIXEL, {
    headers: { "content-type": "image/gif", "cache-control": "no-store, no-cache, must-revalidate, private", "content-length": String(PIXEL.length) },
  });
}
