import type { Types } from "mongoose";
import { DailyStat, type StatField } from "@/lib/db/models/DailyStat";
import { senderDomain } from "@/lib/email/guards";

/** Increment daily counters for a team. Never throws into the caller. */
export function bumpStat(
  workspaceId: Types.ObjectId | string,
  from: string | null | undefined,
  fields: Partial<Record<StatField, number>>,
  at: Date = new Date(),
): Promise<void> {
  const day = at.toISOString().slice(0, 10);
  const domain = (from && (from.includes("@") ? senderDomain(from) : from)) || "";
  return DailyStat.updateOne({ workspaceId, day, domain }, { $inc: fields }, { upsert: true })
    .then(() => undefined)
    .catch((err) => console.error("[stats] bump failed", err));
}
