import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Workspace, type ApiKeyDoc, type WorkspaceDoc } from "@/lib/db/models";
import { hashApiKey, parseBearer } from "@/lib/auth/apiKey";

export type ApiAuthResult =
  | { ok: true; workspace: WorkspaceDoc; apiKey: ApiKeyDoc }
  | { ok: false; status: number; code: string; message: string };

/**
 * Authenticate a REST request by its `Authorization: Bearer ns_live_...` header.
 * Looks up the key by hash, checks it isn't revoked, and loads the workspace.
 * Every downstream query MUST be scoped to `workspace._id` for tenant isolation.
 */
export async function authenticateApiRequest(req: Request): Promise<ApiAuthResult> {
  const token = parseBearer(req.headers.get("authorization"));
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "missing_api_key",
      message: "Missing API key. Pass it as `Authorization: Bearer ns_live_...`.",
    };
  }
  if (!/^ns_(live|test)_[0-9a-f]{64}$/.test(token)) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "Malformed API key." };
  }

  await connectToDatabase();
  const apiKey = await ApiKey.findOne({ keyHash: hashApiKey(token) });
  if (!apiKey || apiKey.revokedAt) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "Invalid API key." };
  }

  const workspace = await Workspace.findById(apiKey.workspaceId);
  if (!workspace) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "Workspace not found." };
  }

  // Fire-and-forget last-used timestamp (don't block the request path).
  ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

  return { ok: true, workspace, apiKey };
}
