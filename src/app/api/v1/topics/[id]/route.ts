import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Contact, Topic } from "@/lib/db/models";
import { serializeTopic } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = apiRoute<{ id: string }>({ endpoint: "/topics/:id" }, async ({ workspace, params, body }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Topic not found.");
  const input = await body(
    z.object({
      name: z.string().trim().min(1).max(80).optional(),
      description: z.string().max(300).optional(),
      default_subscription: z.enum(["opt_in", "opt_out"]).optional(),
      visibility: z.enum(["public", "private"]).optional(),
    }),
  );
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.description !== undefined) set.description = input.description;
  if (input.default_subscription) set.defaultSubscribed = input.default_subscription === "opt_in";
  if (input.visibility) set.visibility = input.visibility;
  const t = await Topic.findOneAndUpdate({ _id: params.id, workspaceId: workspace._id }, { $set: set }, { returnDocument: "after" }).lean();
  if (!t) apiFail(404, "not_found", "Topic not found.");
  return { data: serializeTopic(t) };
});

export const DELETE = apiRoute<{ id: string }>({ endpoint: "/topics/:id" }, async ({ workspace, params }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Topic not found.");
  const t = await Topic.findOneAndDelete({ _id: params.id, workspaceId: workspace._id });
  if (!t) apiFail(404, "not_found", "Topic not found.");
  await Contact.updateMany({ workspaceId: workspace._id }, { $pull: { topics: { topicId: t._id } } });
  return { data: { object: "topic", id: String(t._id), deleted: true } };
});
