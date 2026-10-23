import { DOCS } from "@/content/docs";
import { FEATURES } from "@/content/features";
import { COMPARISONS } from "@/content/compare";
import { FAQS } from "@/lib/knowledge";
import { getPublishedPosts } from "@/lib/blog";
import { absUrl, site } from "@/lib/site";

/** /llms.txt — the llmstxt.org index: a concise map of the site for AI assistants. */
export async function llmsIndex(): Promise<string> {
  const posts = await getPublishedPosts();
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "Stack Emails exposes a REST API at https://stackemails.com/v1 (bearer API keys), a Node.js SDK (`npm install stackemails`), an SMTP relay at smtp.stackemails.com, and a remote MCP server at https://stackemails.com/api/mcp. Free plan: 3,000 emails/month (100/day).",
    "",
    "## Docs",
    ...DOCS.map((d) => `- [${d.title}](${absUrl(`/docs/${d.slug}`)}): ${d.description}`),
    "",
    "## Product",
    ...FEATURES.map((f) => `- [${f.name}](${absUrl(`/features/${f.slug}`)}): ${f.metaDescription}`),
    `- [Pricing](${absUrl("/pricing")}): Free, Pro ($25/mo) and Scale ($100/mo) plans.`,
    "",
    "## Guides",
    ...posts.map((p) => `- [${p.title}](${absUrl(`/blog/${p.slug}`)}): ${p.excerpt}`),
    "",
    "## Optional",
    ...COMPARISONS.map((c) => `- [Stack Emails vs ${c.name}](${absUrl(`/compare/${c.slug}`)})`),
    `- [Security](${absUrl("/security")})`,
    `- [Privacy policy](${absUrl("/privacy")})`,
    `- [Full documentation in one file](${absUrl("/llms-full.txt")})`,
    "",
  ];
  return lines.join("\n");
}

/** /llms-full.txt — the complete docs and FAQs as plain Markdown. */
export async function llmsFull(): Promise<string> {
  const parts = [`# ${site.name} — complete documentation`, "", `> ${site.description}`, ""];
  for (const d of DOCS) parts.push(`# ${d.title}`, "", `Source: ${absUrl(`/docs/${d.slug}`)}`, "", d.description, "", d.content, "");
  parts.push("# Frequently asked questions", "");
  for (const f of FAQS) parts.push(`## ${f.q}`, "", f.a, "");
  return parts.join("\n");
}

export function textResponse(body: string) {
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=3600" } });
}
