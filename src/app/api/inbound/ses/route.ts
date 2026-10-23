import { apiJson } from "@/lib/api/response";
import { confirmSubscription, verifySnsMessage } from "@/lib/aws/sns";
import { ingestInbound } from "@/lib/inbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inbound email endpoint for SES receiving. Configure a receipt rule for
 * ".in.stackemails.com" (and any custom receiving domains) with an SNS action
 * (encoding: Base64) whose topic delivers to this URL. SNS signatures are
 * verified before anything is stored.
 */
export async function POST(req: Request) {
  const verified = await verifySnsMessage(await req.text());
  if (!verified.ok) return apiJson({ ok: false, error: "invalid_signature" }, 403);
  const sns = verified.message;

  if (sns.Type === "SubscriptionConfirmation") return apiJson({ ok: await confirmSubscription(sns) });
  if (sns.Type !== "Notification") return apiJson({ ok: true, ignored: true });

  let payload: {
    notificationType?: string;
    content?: string;
    receipt?: { recipients?: string[]; spamVerdict?: { status?: string }; virusVerdict?: { status?: string }; action?: { encoding?: string } };
  };
  try {
    payload = JSON.parse(sns.Message);
  } catch {
    return apiJson({ ok: true, ignored: true });
  }
  if (payload.notificationType !== "Received" || !payload.content) return apiJson({ ok: true, ignored: true });

  const raw = payload.receipt?.action?.encoding === "BASE64" ? Buffer.from(payload.content, "base64") : payload.content;
  const stored = await ingestInbound(raw, payload.receipt?.recipients, {
    spam: payload.receipt?.spamVerdict?.status,
    virus: payload.receipt?.virusVerdict?.status,
  });
  return apiJson({ ok: true, stored: stored.length });
}
