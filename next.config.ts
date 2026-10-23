import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
