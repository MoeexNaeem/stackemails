import { createElement } from "react";
import { after } from "next/server";
import { isValidObjectId } from "mongoose";
import { apiError, apiJson } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace, roleIn } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { ManualPayment, Plan, nextSequence } from "@/lib/db/models";
import { manualPayEnabled, paymentReference, PROOF_MAX_BYTES, sniffProofType } from "@/lib/billing/manual";
import { getRateLimiter } from "@/lib/ratelimit";
import { sendSystemEmail } from "@/lib/email/system";
import { NoticeEmail } from "@/emails/system";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .trim()
    .slice(0, max);

// POST /api/billing/manual-payment - a customer submits proof of a bank transfer.
export async function POST(req: Request) {
  // Only accept submissions from our own pages.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(env.appUrl).host) return apiError(403, "forbidden", "Invalid origin.");
  if (!manualPayEnabled()) return apiError(404, "not_available", "Bank transfer isn't available right now.");

  const user = await getCurrentUser();
  if (!user) return apiError(401, "unauthorized", "Please sign in again.");
  const workspace = await getActiveWorkspace(user);
  if (!workspace) return apiError(401, "unauthorized", "Please sign in again.");
  await connectToDatabase();
  const role = await roleIn(user._id, workspace._id);
  if (role !== "owner" && role !== "admin") return apiError(403, "forbidden", "Only team owners and admins can pay for a plan.");
  if (workspace.status && workspace.status !== "active") return apiError(403, "forbidden", "This team is suspended. Contact support@stackemails.com.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "invalid_body", "Upload failed. Try again.");
  }
  const planId = String(form.get("planId") ?? "");
  if (!isValidObjectId(planId)) return apiError(422, "validation_error", "Choose a plan.");
  const plan = await Plan.findOne({ _id: planId, isActive: true }).lean();
  if (!plan || plan.priceMonthly <= 0) return apiError(422, "validation_error", "Choose a paid plan.");

  const file = form.get("proof");
  if (!(file instanceof File) || file.size === 0) return apiError(422, "validation_error", "Attach a screenshot or PDF of your transfer.");
  if (file.size > PROOF_MAX_BYTES) return apiError(422, "validation_error", "The file is too large. The maximum is 5 MB.");
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniffProofType(data);
  if (!contentType) return apiError(422, "validation_error", "Upload a PNG, JPG or WEBP image, or a PDF.");

  const payerName = clean(form.get("payerName"), 120);
  const payerNote = clean(form.get("payerNote"), 500);
  if (!payerName) return apiError(422, "validation_error", "Enter the name on the account you paid from.");

  if (await ManualPayment.exists({ workspaceId: workspace._id, status: "pending" })) {
    return apiError(409, "already_pending", "You already have a payment waiting for confirmation. We'll email you as soon as it's checked.");
  }
  const rl = await getRateLimiter().check(`manual-pay:${workspace._id}`, 5, 86_400_000);
  if (!rl.allowed) return apiError(429, "rate_limited", "Too many submissions today. Contact support@stackemails.com.");

  const number = await nextSequence("manual-payment", 1000);
  const reference = paymentReference(workspace._id);
  await ManualPayment.create({
    workspaceId: workspace._id, workspaceName: workspace.name, userId: user._id, email: user.email,
    planId: plan._id, planName: plan.name, amount: plan.priceMonthly, reference, number,
    payerName, payerNote,
    proof: { data, contentType, size: data.length, filename: clean(file.name, 120) || "proof" },
  });

  after(() =>
    sendSystemEmail({
      kind: "ticket_alert",
      to: env.supportEmail,
      subject: `Bank transfer #${number} to check: ${workspace.name} to ${plan.name} ($${plan.priceMonthly})`,
      react: createElement(NoticeEmail, {
        heading: "A customer says they've paid by bank transfer",
        paragraphs: [
          `${user.email} (team "${workspace.name}") sent proof of a $${plan.priceMonthly} transfer for ${plan.name}. Reference: ${reference}. Paid from: ${payerName}.`,
          "Check that the money has actually arrived in your bank account before approving. Screenshots can be faked.",
        ],
        cta: { label: "Review payment", href: `${env.appUrl}/admin/payments` },
      }),
    }),
  );

  return apiJson(
    { ok: true, number, message: `Thanks! Payment #${number} is waiting for confirmation. We'll email ${user.email} as soon as it's checked, usually within a few hours.` },
    201,
  );
}
