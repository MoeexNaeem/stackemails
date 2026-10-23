import { sentThisPeriod } from "@/lib/quota";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { getRateLimiter } from "@/lib/ratelimit";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain, ApiKey } from "@/lib/db/models";
import { PRODUCT_BRIEF, searchFaqs } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(30),
});

// Frozen system prompt (byte-stable → prompt-cacheable). Per-team context goes
// in the first user turn instead, so the cached prefix is shared by everyone.
const SYSTEM = `You are the Stack Emails in-app assistant. Help users of the Stack Emails dashboard send email, verify domains, debug API errors and improve deliverability. Be concise and practical: short paragraphs, numbered steps for procedures, and code in fenced blocks. Only describe features listed in the product brief; if something isn't supported, say so and suggest the closest option or contacting support via Help → New ticket. Never ask for or repeat API keys or passwords.

<product_brief>
${PRODUCT_BRIEF}
</product_brief>`;

function textStream(text: string) {
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

/** Answer from the local knowledge base when no Claude credentials are configured. */
function offlineAnswer(question: string): string {
  const hits = searchFaqs(question, 2);
  if (!hits.length) {
    return "I couldn't find that in the knowledge base. Try rephrasing, browse the docs at /docs, or open Help → New ticket and our team will get back to you.";
  }
  return hits.map((h) => `**${h.q}**\n${h.a}`).join("\n\n");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "unauthorized", "Sign in to use the assistant.");

  const rl = await getRateLimiter().check(`assistant:${user._id}`, 20, 60_000);
  if (!rl.allowed) return apiError(429, "rate_limited", "You're sending messages too quickly. Try again in a minute.");

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return apiError(422, "validation_error", "Send { messages: [{ role, content }] }.");
  }
  if (body.messages[0].role !== "user" || body.messages[body.messages.length - 1].role !== "user") {
    return apiError(422, "validation_error", "Conversation must start and end with a user message.");
  }

  const lastQuestion = body.messages[body.messages.length - 1].content;
  const activeWs = await getActiveWorkspace(user);
  if (activeWs?.labs?.assistant === false) return apiError(403, "disabled", "The assistant is turned off for this team (Settings → Labs).");
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return textStream(offlineAnswer(lastQuestion));
  }

  // Lightweight team context so answers can be specific ("your domain is still pending").
  await connectToDatabase();
  const workspace = await getActiveWorkspace(user);
  const [domains, keyCount] = workspace
    ? await Promise.all([
        Domain.find({ workspaceId: workspace._id }).select("name status").lean(),
        ApiKey.countDocuments({ workspaceId: workspace._id, revokedAt: { $exists: false } }),
      ])
    : [[], 0];
  const context = workspace
    ? `<team_context>Team: ${workspace.name}. Plan: ${workspace.plan}. Usage this period: ${sentThisPeriod(workspace)}/${workspace.monthlyQuota} emails. Domains: ${domains.map((d) => `${d.name} (${d.status})`).join(", ") || "none"}. Active API keys: ${keyCount}.</team_context>\n\n`
    : "";

  const messages: Anthropic.Beta.BetaMessageParam[] = body.messages.map((m, i) => ({
    role: m.role,
    content: i === 0 ? context + m.content : m.content,
  }));

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const s = client.beta.messages.stream({
          model: "claude-opus-5-5",
          max_tokens: 4000,
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          messages,
        });
        for await (const event of s) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\nI can't help with that one. For account-specific issues, open Help → New ticket."));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n…(answer truncated — ask me to continue)"));
        }
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) {
          controller.enqueue(encoder.encode("The assistant is busy right now. Please try again in a moment."));
        } else if (err instanceof Anthropic.AuthenticationError) {
          console.error("[assistant] Anthropic auth failed — check ANTHROPIC_API_KEY");
          controller.enqueue(encoder.encode(offlineAnswer(lastQuestion)));
        } else {
          console.error("[assistant] error", err);
          controller.enqueue(encoder.encode(offlineAnswer(lastQuestion)));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
