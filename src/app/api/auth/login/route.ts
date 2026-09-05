import { apiError, apiJson } from "@/lib/api/response";
import { loginSchema } from "@/lib/validation/schemas";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", "Invalid email or password.");
  }

  await connectToDatabase();
  const user = await User.findOne({ email: parsed.data.email });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return apiError(401, "invalid_credentials", "Invalid email or password.");
  }

  await createSession(String(user._id), req.headers.get("user-agent") ?? undefined);
  return apiJson({ ok: true });
}
