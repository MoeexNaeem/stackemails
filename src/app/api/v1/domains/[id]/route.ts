import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Domain } from "@/lib/db/models";
import { deleteDomain, setReceiving } from "@/lib/domains";
import { serializeDomain } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute<{ id: string }>({ endpoint: "/domains/:id" }, async ({ workspace, params }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Domain not found.");
  const d = await Domain.findOne({ _id: params.id, workspaceId: workspace._id }).lean();
  if (!d) apiFail(404, "not_found", "Domain not found.");
  return { data: serializeDomain(d, true) };
});

// PATCH /v1/domains/:id — { open_tracking?, click_tracking?, tls?: "opportunistic"|"enforced", receiving? }
export const PATCH = apiRoute<{ id: string }>({ endpoint: "/domains/:id" }, async ({ workspace, params, body }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Domain not found.");
  const input = await body(z.object({ open_tracking: z.boolean().optional(), click_tracking: z.boolean().optional(), tls: z.enum(["opportunistic", "enforced"]).optional(), receiving: z.boolean().optional() }));
  const d = await Domain.findOne({ _id: params.id, workspaceId: workspace._id });
  if (!d) apiFail(404, "not_found", "Domain not found.");
  if (input.open_tracking !== undefined) d.openTracking = input.open_tracking;
  if (input.click_tracking !== undefined) d.clickTracking = input.click_tracking;
  if (input.tls) d.tlsMode = input.tls;
  await d.save();
  if (input.receiving !== undefined) await setReceiving(d, input.receiving);
  return { data: serializeDomain(d, true) };
});

export const DELETE = apiRoute<{ id: string }>({ endpoint: "/domains/:id" }, async ({ workspace, params }) => {
  if (!isValidObjectId(params.id) || !(await deleteDomain(workspace._id, params.id))) apiFail(404, "not_found", "Domain not found.");
  return { data: { object: "domain", id: params.id, deleted: true } };
});
