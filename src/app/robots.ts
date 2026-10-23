import type { MetadataRoute } from "next";
import { absUrl, site } from "@/lib/site";

// Private app surfaces: never useful in search results.
const PRIVATE = [
  "/api/",
  "/admin",
  "/overview",
  "/emails",
  "/templates",
  "/audience",
  "/segments",
  "/topics",
  "/broadcasts",
  "/automations",
  "/metrics",
  "/logs",
  "/domains",
  "/api-keys",
  "/webhooks",
  "/inboxes",
  "/settings",
  "/profile",
  "/onboarding",
  "/help",
  "/u/",
  "/invite/",
  "/reset-password",
  "/forgot-password",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // AI assistants and answer engines may read the public site (see /llms.txt).
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"], allow: "/", disallow: PRIVATE },
    ],
    sitemap: absUrl("/sitemap.xml"),
    host: site.url,
  };
}
