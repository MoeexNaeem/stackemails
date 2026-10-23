import { connectToDatabase } from "@/lib/db/connect";
import { Contact } from "@/lib/db/models";
import { verifyUnsubscribeToken } from "@/lib/contacts";
import { emitEvent } from "@/lib/webhooks/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 8058 one-click unsubscribe target (List-Unsubscribe-Post). Mail
 * providers POST here with body "List-Unsubscribe=One-Click". Idempotent.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const contactId = verifyUnsubscribeToken(token);
  if (!contactId) return new Response("Invalid unsubscribe link", { status: 400 });

  await connectToDatabase();
  const contact = await Contact.findOneAndUpdate(
    { _id: contactId, unsubscribed: { $ne: true } },
    { $set: { unsubscribed: true, unsubscribedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (contact) {
    emitEvent(String(contact.workspaceId), "contact.updated", { id: String(contact._id), email: contact.email, unsubscribed: true }).catch(() => {});
  }
  return new Response("Unsubscribed", { status: 200, headers: { "cache-control": "no-store" } });
}
