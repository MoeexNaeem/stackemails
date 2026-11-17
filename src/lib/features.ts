/**
 * Product feature switches. Plain module (works in server, client and worker code).
 *
 * Marketing email (Broadcasts, Audiences/contacts, Automations) is OFF unless
 * NEXT_PUBLIC_MARKETING_FEATURES=on. Stack Emails is offered as a transactional
 * email service; our payment provider (Paddle) doesn't support email marketing
 * platforms, so only turn this on with the provider's agreement. Turning it off
 * hides the features everywhere (dashboard, API, MCP, website) without deleting data.
 * Read at build time: changing it needs a rebuild (setup.sh does that).
 */
export const MARKETING_ENABLED = process.env.NEXT_PUBLIC_MARKETING_FEATURES === "on";

export function marketingEnabled(): boolean {
  return MARKETING_ENABLED;
}

/** Public API endpoints that belong to the marketing features. */
const MARKETING_API_PREFIXES = ["/broadcasts", "/audiences", "/contacts", "/contact-properties", "/segments", "/topics", "/events"];

export function isMarketingEndpoint(endpoint: string): boolean {
  return MARKETING_API_PREFIXES.some((p) => endpoint === p || endpoint.startsWith(`${p}/`));
}

/** Website pages that only exist while marketing features are on. */
export const MARKETING_DOC_SLUGS = new Set(["contacts", "segments-topics", "broadcasts", "events"]);
export const MARKETING_FEATURE_SLUGS = new Set(["marketing-email"]);
export const MARKETING_ALTERNATIVE_SLUGS = new Set(["brevo"]);
