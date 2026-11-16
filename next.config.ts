import type { NextConfig } from "next";

// Security headers on every response. The CSP is deliberately limited to the
// directives that can't break rendering (no script-src): framing, plugins,
// <base> hijacking and mixed content.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Expose the public REST API under a clean /v1/* path while keeping the
  // route handlers organised under app/api/v1/*.
  async rewrites() {
    return [{ source: "/v1/:path*", destination: "/api/v1/:path*" }];
  },
  async redirects() {
    return [
      { source: "/audiences", destination: "/audience", permanent: true },
      { source: "/audiences/:id", destination: "/audience?segment=:id", permanent: true },
      { source: "/suppressions", destination: "/emails/suppressions", permanent: true },
      { source: "/settings/unsubscribe", destination: "/settings/unsubscribe-page", permanent: true },
    ];
  },
  // These are heavy, Node-only libraries that must not be bundled for the
  // client and should be treated as externals on the server.
  serverExternalPackages: [
    "mongoose",
    "mongodb-memory-server",
    "bullmq",
    "ioredis",
    "bcryptjs",
    "@aws-sdk/client-sesv2",
    "@aws-sdk/client-sns",
    "mailparser",
    "smtp-server",
  ],
};

export default nextConfig;
