import { z } from "zod";
import { apiRoute, apiFail } from "@/lib/api/route";
import { ContactProperty } from "@/lib/db/models";
import { serializeProperty } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVED = new Set(["email", "first_name", "last_name", "unsubscribed", "id", "created_at"]);

export const POST = apiRoute({ endpoint: "/contact-properties" }, async ({ workspace, body }) => {
  const input = await body(
    z.object({
      key: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/, "Keys must be snake_case, start with a letter, max 50 chars"),
      label: z.string().trim().min(1).max(80).optional(),
      type: z.enum(["string", "number", "boolean", "date"]).default("string"),
      fallback_value: z.string().max(200).optional(),
    }),
  );
  if (RESERVED.has(input.key)) apiFail(422, "validation_error", `"${input.key}" is a built-in field.`);
  try {
    const p = await ContactProperty.create({ workspaceId: workspace._id, key: input.key, label: input.label ?? input.key, type: input.type, fallback: input.fallback_value ?? "" });
    return { status: 201, data: serializeProperty(p) };
  } catch (e) {
    if ((e as { code?: number }).code === 11000) apiFail(409, "property_exists", `A property with key "${input.key}" already exists.`);
    throw e;
  }
});

export const GET = apiRoute({ endpoint: "/contact-properties" }, async ({ workspace }) => {
  const rows = await ContactProperty.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean();
  return { data: { object: "list", data: rows.map(serializeProperty) } };
});
