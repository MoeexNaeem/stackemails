import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Workspace, type ApiKeyDoc, type WorkspaceDoc } from "@/lib/db/models";
import { hashApiKey, parseBearer } from "@/lib/auth/apiKey";

export type ApiAuthResult =
  | { ok: true; workspace: WorkspaceDoc; apiKey: ApiKeyDoc }
  | { ok: false; status: number; code: string; message: string };

export const API_KEY_RE = /^se_(live|test)_[0-9a-f]{64}$/;

/**
 * Resolve a raw API key to its (non-revoked) key and workspace. Shared by the
 * REST API, the SMTP relay and the MCP server. Every downstream query MUST be
 * scoped to `workspace._id` for tenant isolation.
 */
export async function authenticateApiKey(token: string | null | undefined): Promise<ApiAuthResult> {
  if (!token) {
    return { ok: false, status: 401, code: "missing_api_key", message: "Missing API key. Pass it as `Authorization: Bearer se_live_...`." };
  }
  if (!API_KEY_RE.test(token)) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "Malformed API key." };
  }

  await connectToDatabase();
  const apiKey = await ApiKey.findOne({ keyHash: hashApiKey(token) });
  if (!apiKey || apiKey.revokedAt) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "Invalid API key." };
  }

  const workspace = await Workspace.findById(apiKey.workspaceId);
  if (!workspace) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "Team not found." };
  }

  // Admin controls: a suspended or restricted workspace cannot use the API.
  if (workspace.status === "suspended") {
    return { ok: false, status: 403, code: "account_suspended", message: "This account has been suspended. Contact support." };
  }
  if (workspace.status === "restricted") {
    return { ok: false, status: 403, code: "account_restricted", message: workspace.restrictedReason || "This account is restricted from sending." };
  }

  // Fire-and-forget last-used timestamp (don't block the request path).
  ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

  return { ok: true, workspace, apiKey };
}

/** Authenticate a REST request by its `Authorization: Bearer se_live_...` header. */
export async function authenticateApiRequest(req: Request): Promise<ApiAuthResult> {
  return authenticateApiKey(parseBearer(req.headers.get("authorization")));
}
