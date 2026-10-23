"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain } from "@/lib/db/models";
import { createDomainSchema } from "@/lib/validation/schemas";
import { createDomain, deleteDomain, setReceiving, verifyDomain } from "@/lib/domains";

export type DomainState = { ok: boolean; error?: string; message?: string; id?: string };

async function ctx() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  return workspace;
}

export async function createDomainAction(_prev: DomainState, formData: FormData): Promise<DomainState> {
  const workspace = await ctx();
  const parsed = createDomainSchema.safeParse({
    name: formData.get("name"),
    returnPath: formData.get("returnPath") || "send",
    trackingSubdomain: formData.get("trackingSubdomain") || "",
    clickTracking: formData.get("clickTracking") === "on",
    openTracking: formData.get("openTracking") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const res = await createDomain(workspace._id, parsed.data);
  if (!res.ok) return { ok: false, error: res.message };
  revalidatePath("/domains");
  return { ok: true, id: String(res.domain._id) };
}

export async function verifyDomainAction(id: string): Promise<DomainState> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return { ok: false, error: "Domain not found." };
  const domain = await Domain.findOne({ _id: id, workspaceId: workspace._id });
  if (!domain) return { ok: false, error: "Domain not found." };
  const { verified } = await verifyDomain(domain);
  revalidatePath("/domains");
  revalidatePath(`/domains/${id}`);
  const missing = domain.records.filter((r) => r.status !== "verified").length;
  return verified
    ? { ok: true, message: missing ? `Verified for sending. ${missing} optional record${missing === 1 ? "" : "s"} still pending.` : "All records verified." }
    : { ok: false, error: `Not verified yet — ${missing} record${missing === 1 ? "" : "s"} not found in DNS. Changes can take up to 48 hours to propagate.` };
}

export async function deleteDomainAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (isValidObjectId(id)) await deleteDomain(workspace._id, id);
  revalidatePath("/domains");
}

export async function updateDomainSettingsAction(
  id: string,
  patch: { tlsMode?: "opportunistic" | "enforced"; clickTracking?: boolean; openTracking?: boolean; receiving?: boolean },
): Promise<DomainState> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return { ok: false, error: "Domain not found." };
  const domain = await Domain.findOne({ _id: id, workspaceId: workspace._id });
  if (!domain) return { ok: false, error: "Domain not found." };
  if (patch.tlsMode) domain.tlsMode = patch.tlsMode;
  if (patch.clickTracking !== undefined) domain.clickTracking = patch.clickTracking;
  if (patch.openTracking !== undefined) domain.openTracking = patch.openTracking;
  await domain.save();
  if (patch.receiving !== undefined) await setReceiving(domain, patch.receiving);
  revalidatePath(`/domains/${id}`);
  return { ok: true, message: "Saved." };
}
