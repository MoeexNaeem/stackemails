/** Per-plan resource limits (sending quotas live on the Plan / Workspace documents). */
export type PlanKey = "free" | "pro" | "scale";

export const PLAN_LIMITS: Record<PlanKey, { domains: number; members: number; segments: number; inboxes: number; webhooks: number; retentionDays: number }> = {
  free: { domains: 1, members: 3, segments: 3, inboxes: 3, webhooks: 5, retentionDays: 30 },
  pro: { domains: 10, members: 10, segments: Infinity, inboxes: 10, webhooks: 20, retentionDays: 30 },
  scale: { domains: 1000, members: 50, segments: Infinity, inboxes: 100, webhooks: 50, retentionDays: 30 },
};

export function limitsFor(plan: string | null | undefined) {
  return PLAN_LIMITS[(plan as PlanKey) in PLAN_LIMITS ? (plan as PlanKey) : "free"];
}

export function fmtLimit(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "Unlimited";
}
