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

  // Sign in with Google (OAuth web client). Mixed-case names are accepted too.
  google: {
    clientId: str("GOOGLE_CLIENT_ID", str("Google_Client_ID")),
    clientSecret: str("GOOGLE_CLIENT_SECRET", str("Google_Client_Secret")),
  },

  // Bank transfer details shown to customers paying by transfer while no card
  // processor is connected. Kept in the server's .env, never in the code.
  // Turned on when MANUAL_PAY_ACCOUNT_NUMBER is set.
  manualPay: {
    beneficiary: str("MANUAL_PAY_BENEFICIARY"),
    bankName: str("MANUAL_PAY_BANK_NAME"),
    accountNumber: str("MANUAL_PAY_ACCOUNT_NUMBER"),
    routingNumber: str("MANUAL_PAY_ROUTING_NUMBER"),
    accountType: str("MANUAL_PAY_ACCOUNT_TYPE", "Checking"),
    address: str("MANUAL_PAY_ADDRESS"),
    // Optional extra line, e.g. "Payoneer / Wise also accepted: email support@stackemails.com"
    note: str("MANUAL_PAY_NOTE"),
  },

  // Paddle Billing (card/PayPal checkout, merchant of record). Turned on when the
  // API key, client token and both price IDs are set.
  paddle: {
    environment: str("PADDLE_ENV", "sandbox"), // "sandbox" or "production"
    apiKey: str("PADDLE_API_KEY"),
    clientToken: str("PADDLE_CLIENT_TOKEN"),
    webhookSecret: str("PADDLE_WEBHOOK_SECRET"),
    pricePro: str("PADDLE_PRICE_PRO"),
    priceScale: str("PADDLE_PRICE_SCALE"),
  },

  // Cloudflare Turnstile bot check on signup (both keys needed to turn it on).
  turnstile: {
    siteKey: str("TURNSTILE_SITE_KEY"),
    secretKey: str("TURNSTILE_SECRET_KEY"),
  },

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
