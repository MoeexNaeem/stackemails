import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { authenticateApiKey } from "@/lib/auth/apiAuth";
import { parseBearer } from "@/lib/auth/apiKey";
import { getRateLimiter } from "@/lib/ratelimit";
import { logApiRequest } from "@/lib/apiLog";
import { Contact, Domain, EmailLog, InboundEmail, Segment } from "@/lib/db/models";
import { createAndQueueEmail } from "@/lib/email/send";
import { upsertContact } from "@/lib/contacts";
import { serializeContact, serializeDomain, serializeEmail, serializeInbound, serializeSegment } from "@/lib/api/serializers";
import type { ApiKeyDoc, WorkspaceDoc } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Model Context Protocol server (Streamable HTTP transport, JSON responses).
 * Lets AI agents (Claude, Cursor, …) send email and read data with an API key:
 *   { "mcpServers": { "stackemails": { "url": "https://stackemails.com/api/mcp",
 *       "headers": { "Authorization": "Bearer se_live_…" } } } }
 */
const PROTOCOL_VERSION = "2025-06-18";

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  sending?: boolean;
  run: (args: Record<string, unknown>, ctx: { workspace: WorkspaceDoc; apiKey: ApiKeyDoc }) => Promise<unknown>;
};

const str = (d: string) => ({ type: "string", description: d });
const strArr = (d: string) => ({ type: "array", items: { type: "string" }, description: d });

const TOOLS: Tool[] = [
  {
    name: "send_email",
    description: "Send (or schedule) an email from a verified domain. Returns the email id.",
    sending: true,
    inputSchema: {
      type: "object",
      properties: { from: str('Sender, e.g. "Acme <hello@acme.com>", must be on a verified domain'), to: strArr("Recipient addresses"), subject: str("Subject line"), html: str("HTML body"), text: str("Plain-text body"), cc: strArr("Cc"), bcc: strArr("Bcc"), reply_to: strArr("Reply-To"), scheduled_at: str("Optional ISO 8601 time to send, up to 30 days ahead") },
      required: ["from", "to", "subject"],
      additionalProperties: false,
    },
    async run(a, { workspace, apiKey }) {
      const p = z.object({ from: z.string(), to: z.array(z.string()).min(1), subject: z.string().min(1), html: z.string().optional(), text: z.string().optional(), cc: z.array(z.string()).optional(), bcc: z.array(z.string()).optional(), reply_to: z.array(z.string()).optional(), scheduled_at: z.string().optional() }).parse(a);
      const r = await createAndQueueEmail(workspace, { from: p.from, to: p.to, cc: p.cc, bcc: p.bcc, replyTo: p.reply_to, subject: p.subject, html: p.html, text: p.text, scheduledAt: p.scheduled_at ? new Date(p.scheduled_at) : null, source: "api", apiKeyId: apiKey._id });
      if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
      return { id: r.email.messageId, status: r.email.status };
    },
  },
  {
    name: "list_emails",
    description: "List recently sent emails with their delivery status.",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "1-50 (default 10)" }, status: str("Filter by status, e.g. delivered, bounced") }, additionalProperties: false },
    async run(a, { workspace }) {
      const limit = Math.min(50, Math.max(1, Number(a.limit ?? 10)));
      const filter: Record<string, unknown> = { workspaceId: workspace._id };
      if (typeof a.status === "string" && a.status) filter.status = a.status;
      const rows = await EmailLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      return rows.map((e) => serializeEmail(e));
    },
  },
  {
    name: "get_email",
    description: "Get one email with its content and full event history.",
    inputSchema: { type: "object", properties: { id: str("Email id (msg_…)") }, required: ["id"], additionalProperties: false },
    async run(a, { workspace }) {
      const e = await EmailLog.findOne({ workspaceId: workspace._id, messageId: String(a.id) }).lean();
      if (!e) throw new Error("Email not found.");
      return serializeEmail(e, true);
    },
  },
  {
    name: "list_domains",
    description: "List sending domains and whether each is verified.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run(_a, { workspace }) {
      return (await Domain.find({ workspaceId: workspace._id }).lean()).map((d) => serializeDomain(d));
    },
  },
  {
    name: "create_contact",
    description: "Create or update a contact, optionally adding it to segments.",
    inputSchema: { type: "object", properties: { email: str("Email address"), first_name: str("First name"), last_name: str("Last name"), segment_ids: strArr("Segment ids to add the contact to") }, required: ["email"], additionalProperties: false },
    async run(a, { workspace }) {
      const segs = Array.isArray(a.segment_ids) ? (a.segment_ids as string[]).filter(isValidObjectId) : [];
      const owned = segs.length ? (await Segment.find({ _id: { $in: segs }, workspaceId: workspace._id }).select("_id").lean()).map((s) => String(s._id)) : [];
      const { contact } = await upsertContact(workspace._id, { email: String(a.email ?? ""), firstName: a.first_name as string | undefined, lastName: a.last_name as string | undefined, segmentIds: owned, source: "api" });
      return serializeContact(contact);
    },
  },
  {
    name: "list_contacts",
    description: "Search contacts by email.",
    inputSchema: { type: "object", properties: { q: str("Email search"), limit: { type: "number", description: "1-100 (default 20)" } }, additionalProperties: false },
    async run(a, { workspace }) {
      const filter: Record<string, unknown> = { workspaceId: workspace._id };
      if (typeof a.q === "string" && a.q) filter.email = { $regex: a.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase() };
      return (await Contact.find(filter).sort({ createdAt: -1 }).limit(Math.min(100, Number(a.limit ?? 20))).lean()).map(serializeContact);
    },
  },
  {
    name: "list_segments",
    description: "List audience segments.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run(_a, { workspace }) {
      return (await Segment.find({ workspaceId: workspace._id }).lean()).map((s) => serializeSegment(s));
    },
  },
  {
    name: "list_received_emails",
    description: "Read recently received (inbound) emails, optionally for one inbox.",
    inputSchema: { type: "object", properties: { inbox_id: str("Inbox id"), limit: { type: "number", description: "1-50 (default 10)" }, include_body: { type: "boolean", description: "Include text body" } }, additionalProperties: false },
    async run(a, { workspace }) {
      const filter: Record<string, unknown> = { workspaceId: workspace._id, direction: "inbound" };
      if (typeof a.inbox_id === "string" && isValidObjectId(a.inbox_id)) filter.inboxId = a.inbox_id;
      const rows = await InboundEmail.find(filter).sort({ createdAt: -1 }).limit(Math.min(50, Number(a.limit ?? 10))).lean();
      return rows.map((e) => serializeInbound(e, !!a.include_body));
    },
  },
];

type RpcReq = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
const rpcResult = (id: RpcReq["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const rpcError = (id: RpcReq["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg: RpcReq, ctx: { workspace: WorkspaceDoc; apiKey: ApiKeyDoc }) {
  switch (msg.method) {
    case "initialize":
      return rpcResult(msg.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "stackemails", title: "Stack Emails", version: "1.0.0" },
        instructions: "Send transactional email, inspect delivery, and manage contacts for your Stack Emails team. Only send from verified domains.",
      });
    case "ping":
      return rpcResult(msg.id, {});
    case "tools/list":
      return rpcResult(msg.id, {
        tools: TOOLS.filter((t) => ctx.apiKey.permission !== "sending_access" || t.sending).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return rpcError(msg.id, -32602, `Unknown tool: ${name}`);
      if (ctx.apiKey.permission === "sending_access" && !tool.sending) return rpcResult(msg.id, { content: [{ type: "text", text: "This API key only has sending access." }], isError: true });
      try {
        const out = await tool.run((msg.params?.arguments as Record<string, unknown>) ?? {}, ctx);
        return rpcResult(msg.id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: Array.isArray(out) ? { items: out } : out, isError: false });
      } catch (err) {
        const text = err instanceof z.ZodError ? `Invalid arguments: ${err.issues[0]?.path.join(".")} ${err.issues[0]?.message}` : err instanceof Error ? err.message : "Tool failed";
        return rpcResult(msg.id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      return msg.method.startsWith("notifications/") ? null : rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const auth = await authenticateApiKey(parseBearer(req.headers.get("authorization")));
  if (!auth.ok) {
    return Response.json(rpcError(null, -32001, auth.message), { status: 401, headers: { "www-authenticate": 'Bearer realm="stackemails"' } });
  }
  const rl = await getRateLimiter().check(`mcp:${auth.apiKey._id}`, 20, 1000);
  if (!rl.allowed) return Response.json(rpcError(null, -32002, "Rate limited"), { status: 429 });

  let body: RpcReq | RpcReq[];
  try {
    body = await req.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }
  const batch = Array.isArray(body) ? body : [body];
  const results = (await Promise.all(batch.map((m) => (m && m.jsonrpc === "2.0" && typeof m.method === "string" ? handle(m, auth) : Promise.resolve(rpcError(null, -32600, "Invalid Request")))))).filter((r) => r !== null);
  logApiRequest({ workspace: auth.workspace, req: new Request(req.url, { method: "POST", headers: { "user-agent": "stackemails-mcp" } }), endpoint: `/mcp ${batch.map((m) => m?.method).join(",")}`.slice(0, 120), status: 200, startedAt, apiKey: auth.apiKey, requestBody: body });

  if (results.length === 0) return new Response(null, { status: 202 }); // notifications only
  return Response.json(Array.isArray(body) ? results : results[0], { headers: { "cache-control": "no-store" } });
}

export async function GET() {
  // No server-initiated stream; clients use POST.
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}
