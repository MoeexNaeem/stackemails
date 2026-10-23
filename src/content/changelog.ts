/** Public changelog entries, newest first. */
export type ChangelogEntry = { date: string; title: string; tag: "New" | "Improved" | "Fixed"; items: string[] };

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-23",
    title: "Inboxes, MCP server and a new dashboard",
    tag: "New",
    items: [
      "Shared inboxes: receive email on a free address or your own domain, read threads and reply from the dashboard.",
      "Remote MCP server so Claude, Cursor and other agents can send email and read delivery status.",
      "Redesigned dashboard with an overview of volume, delivery and engagement, and a dark/light theme.",
      "Ask anything: an in-dashboard assistant that answers questions about your account and the API.",
    ],
  },
  {
    date: "2026-10-20",
    title: "Contacts, segments and topics",
    tag: "New",
    items: [
      "Team-wide contacts with custom properties, CSV import and export.",
      "Segments replace audiences; subscription topics let recipients choose what they receive.",
      "Hosted, brandable unsubscribe page with RFC 8058 one-click unsubscribe on every broadcast.",
    ],
  },
  {
    date: "2026-10-17",
    title: "Scheduling, batch sends and idempotency",
    tag: "New",
    items: [
      "Schedule emails up to 30 days ahead, then reschedule or cancel them.",
      "POST /v1/emails/batch sends up to 100 emails per request.",
      "Idempotency-Key header for safe retries.",
      "Attachments, custom headers and tags on every send.",
    ],
  },
  {
    date: "2026-10-15",
    title: "Reliable webhooks",
    tag: "Improved",
    items: [
      "Timestamped v2 signatures for replay protection, plus a verifyWebhook helper in the SDK.",
      "Six delivery attempts with backoff, a per-endpoint delivery log and one-click redelivery.",
      "Contact and domain events alongside email events.",
    ],
  },
  {
    date: "2026-10-12",
    title: "Security hardening",
    tag: "Improved",
    items: [
      "Two-factor authentication with recovery codes.",
      "Sending-only API keys can be restricted to a single domain.",
      "Sign-in rate limiting and verified Amazon SNS notifications.",
    ],
  },
];
