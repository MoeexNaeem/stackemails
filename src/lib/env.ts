/**
 * Centralised, typed access to environment configuration.
 * Everything has a local-dev default so the app boots with no setup.
 */

function str(key: string, fallback = ""): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

export const env = {
  appUrl: str("APP_URL", "http://localhost:3000"),
  sessionSecret: str(
    "SESSION_SECRET",
    "dev-only-insecure-secret-change-me-0123456789abcdef",
  ),

  mongoUri: str("MONGODB_URI"),
  mongoDbName: str("MONGODB_DB_NAME", "stackemails"),

  emailProvider: str("EMAIL_PROVIDER", "mock") as "mock" | "ses",
  queueDriver: str("QUEUE_DRIVER", "memory") as "memory" | "bullmq",
  rateLimitDriver: str("RATE_LIMIT_DRIVER", "memory") as "memory" | "redis",

  redisUrl: str("REDIS_URL", "redis://127.0.0.1:6379"),

  // Sender for platform emails (welcome, password reset, receipts). The domain
  // must be verified in SES, e.g. "Stack Emails <noreply@stackemails.com>".
  systemFromEmail: str("SYSTEM_FROM_EMAIL", "Stack Emails <noreply@stackemails.com>"),
  supportEmail: str("SUPPORT_EMAIL", "support@stackemails.com"),

  // Inbound: each team receives at <anything>@<inboundKey>.<INBOUND_DOMAIN>.
  // Point a wildcard MX (*.INBOUND_DOMAIN) at your SES receiving endpoint.
  inboundDomain: str("INBOUND_DOMAIN", "in.stackemails.com"),

  aws: {
    region: str("AWS_REGION", "us-east-1"),
    accessKeyId: str("AWS_ACCESS_KEY_ID"),
    secretAccessKey: str("AWS_SECRET_ACCESS_KEY"),
    configurationSet: str("SES_CONFIGURATION_SET"),
  },

  get isProd() {
    return process.env.NODE_ENV === "production";
  },
} as const;

export type Env = typeof env;
