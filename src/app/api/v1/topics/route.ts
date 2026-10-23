import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { Topic } from "@/lib/db/models";
import { serializeTopic } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const topicSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(300).optional(),
  default_subscription: z.enum(["opt_in", "opt_out"]).default("opt_in"),
  visibility: z.enum(["public", "private"]).default("public"),
});

export const POST = apiRoute({ endpoint: "/topics" }, async ({ workspace, body }) => {
  const t = await body(topicSchema);
  const doc = await Topic.create({
    workspaceId: workspace._id,
    name: t.name,
    description: t.description ?? "",
    defaultSubscribed: t.default_subscription === "opt_in",
    visibility: t.visibility,
  });
  return { status: 201, data: serializeTopic(doc) };
});

export const GET = apiRoute({ endpoint: "/topics" }, async ({ workspace }) => {
  const rows = await Topic.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean();
  return { data: { object: "list", data: rows.map(serializeTopic) } };
});
