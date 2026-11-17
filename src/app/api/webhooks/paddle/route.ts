import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Plan, Subscription, Workspace } from "@/lib/db/models";
import { activatePlan } from "@/lib/billing/activate";
import { planSlugForPrice, verifyPaddleSignature } from "@/lib/billing/paddle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaddleItem = { price?: { id?: string } };
type PaddlePeriod = { starts_at?: string; ends_at?: string } | null;
type PaddleData = {
  id: string;
  status?: string;
  customer_id?: string;
  subscription_id?: string | null;
  custom_data?: { workspaceId?: string } | null;
  items?: PaddleItem[];
  billing_period?: PaddlePeriod;
  current_billing_period?: PaddlePeriod;
  scheduled_change?: { action?: string; effective_at?: string } | null;
  details?: { totals?: { grand_total?: string; total?: string; currency_code?: string } };
};

const ok = () => new Response("ok", { status: 200 });

/** Find our team for a Paddle object: custom_data first, else the stored subscription. */
async function workspaceFor(d: PaddleData, subscriptionId?: string | null) {
  const id = d.custom_data?.workspaceId;
  if (id && isValidObjectId(id)) return id;
  if (subscriptionId) {
    const sub = await Subscription.findOne({ paddleSubscriptionId: subscriptionId }).select("workspaceId").lean();
    if (sub) return String(sub.workspaceId);
  }
  return null;
}

async function planFor(d: PaddleData) {
  const slug = planSlugForPrice(d.items?.[0]?.price?.id);
  return slug ? Plan.findOne({ slug }).lean() : null;
}

/** Move a team back to Free (Paddle subscription ended). */
async function downgradeToFree(workspaceId: string) {
  const free = await Plan.findOne({ slug: "free" }).lean();
  await Workspace.updateOne(
    { _id: workspaceId },
    { $set: { plan: "free", ...(free ? { monthlyQuota: free.monthlyQuota, dailyQuota: free.dailyQuota, contactsQuota: free.contactsQuota } : {}) } },
  );
  await Subscription.updateOne(
    { workspaceId },
    { $set: { status: "canceled", canceledAt: new Date(), planId: free?._id, planName: free?.name ?? "Free", priceMonthly: 0 }, $unset: { cancelAt: 1 } },
  );
}

// POST /api/webhooks/paddle - Paddle Billing notifications.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaddleSignature(raw, req.headers.get("paddle-signature"))) return new Response("invalid signature", { status: 401 });

  let event: { event_type?: string; data?: PaddleData };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const d = event.data;
  if (!d) return ok();
  await connectToDatabase();

  switch (event.event_type) {
    // Money received: first payment, every renewal, and plan-change charges.
    case "transaction.completed": {
      const workspaceId = await workspaceFor(d, d.subscription_id);
      const plan = await planFor(d);
      if (!workspaceId || !plan) {
        console.warn(`[paddle] transaction ${d.id}: no team or unknown price, ignored`);
        return ok();
      }
      const cents = Number(d.details?.totals?.grand_total ?? d.details?.totals?.total ?? NaN);
      const end = d.billing_period?.ends_at ? new Date(d.billing_period.ends_at) : undefined;
      const start = d.billing_period?.starts_at ? new Date(d.billing_period.starts_at) : undefined;
      const res = await activatePlan(workspaceId, plan._id, {
        amount: Number.isFinite(cents) ? cents / 100 : undefined,
        periodStart: start, periodEnd: end,
        externalId: d.id, provider: "paddle",
        paddle: { subscriptionId: d.subscription_id ?? undefined, customerId: d.customer_id },
      });
      console.log(`[paddle] ${d.id}: team ${workspaceId} on ${plan.slug}${res.duplicate ? " (already recorded)" : ""}`);
      return ok();
    }

    // Subscription changed: plan switch, renewal date, cancellation scheduled or undone.
    case "subscription.created":
    case "subscription.activated":
    case "subscription.updated":
    case "subscription.resumed": {
      const workspaceId = await workspaceFor(d, d.id);
      if (!workspaceId) return ok();
      const cancelAt = d.scheduled_change?.action === "cancel" && d.scheduled_change.effective_at ? new Date(d.scheduled_change.effective_at) : null;
      const end = d.current_billing_period?.ends_at ? new Date(d.current_billing_period.ends_at) : undefined;
      await Subscription.updateOne(
        { workspaceId },
        {
          $set: {
            provider: "paddle", paddleSubscriptionId: d.id, ...(d.customer_id ? { paddleCustomerId: d.customer_id } : {}),
            ...(end ? { currentPeriodEnd: end } : {}),
            ...(d.status === "past_due" ? { status: "past_due" } : d.status === "active" || d.status === "trialing" ? { status: "active" } : {}),
            autoRenew: !cancelAt,
            ...(cancelAt ? { cancelAt } : {}),
          },
          ...(cancelAt ? {} : { $unset: { cancelAt: 1 } }),
        },
        { upsert: true },
      );
      // Plan switched (e.g. Pro -> Scale): apply the new limits right away.
      const plan = await planFor(d);
      if (plan && (d.status === "active" || d.status === "trialing" || d.status === "past_due")) {
        await Workspace.updateOne(
          { _id: workspaceId },
          { $set: { plan: plan.slug === "pro" ? "pro" : "scale", monthlyQuota: plan.monthlyQuota, dailyQuota: plan.dailyQuota, contactsQuota: plan.contactsQuota } },
        );
        await Subscription.updateOne({ workspaceId }, { $set: { planId: plan._id, planName: plan.name, priceMonthly: plan.priceMonthly } });
      }
      return ok();
    }

    case "subscription.past_due": {
      const workspaceId = await workspaceFor(d, d.id);
      if (workspaceId) await Subscription.updateOne({ workspaceId }, { $set: { status: "past_due" } });
      return ok();
    }

    // Subscription over (cancelled at period end, or payments failed for good).
    case "subscription.canceled":
    case "subscription.paused": {
      const workspaceId = await workspaceFor(d, d.id);
      if (workspaceId) await downgradeToFree(workspaceId);
      return ok();
    }

    default:
      return ok();
  }
}
