import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { Plan, Subscription } from "@/lib/db/models";
import { PlansManager, type PlanView } from "@/components/admin/PlansManager";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireAdmin();
  await connectToDatabase();

  const plans = await Plan.find().sort({ order: 1, priceMonthly: 1 }).lean();
  const subCounts = await Subscription.aggregate([{ $group: { _id: "$planId", n: { $sum: 1 } } }]);
  const countByPlan = new Map(subCounts.map((s) => [String(s._id), s.n]));

  const views: PlanView[] = plans.map((p) => ({
    id: String(p._id),
    name: p.name,
    priceMonthly: p.priceMonthly,
    dailyQuota: p.dailyQuota,
    monthlyQuota: p.monthlyQuota,
    contactsQuota: p.contactsQuota,
    features: p.features ?? [],
    isActive: p.isActive,
    subscribers: countByPlan.get(String(p._id)) ?? 0,
  }));

  return <PlansManager plans={views} />;
}
