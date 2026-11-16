import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import { ManualPayment } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/payments/:id/proof - the customer's uploaded proof. Platform admin (with 2FA) only.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "admin" || !user.mfaEnabled) return new Response("Not found", { status: 404 });
  const { id } = await params;
  if (!isValidObjectId(id)) return new Response("Not found", { status: 404 });
  await connectToDatabase();
  const p = await ManualPayment.findById(id).select("+proof.data proof number").lean();
  const data = p?.proof?.data as unknown as { buffer?: ArrayBuffer } | Buffer | undefined;
  if (!p || !data || !p.proof?.contentType) return new Response("Not found", { status: 404 });
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from((data as { buffer: ArrayBuffer }).buffer);
  const isPdf = p.proof.contentType === "application/pdf";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": p.proof.contentType,
      // Images open in the browser; PDFs download, so nothing customer-supplied runs on our domain.
      "Content-Disposition": `${isPdf ? "attachment" : "inline"}; filename="payment-${p.number}.${isPdf ? "pdf" : p.proof.contentType.split("/")[1]}"`,
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
