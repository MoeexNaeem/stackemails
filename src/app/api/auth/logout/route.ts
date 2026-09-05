import { apiJson } from "@/lib/api/response";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return apiJson({ ok: true });
}
