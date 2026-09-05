import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose the public REST API under a clean /v1/* path while keeping the
  // route handlers organised under app/api/v1/*.
  async rewrites() {
    return [{ source: "/v1/:path*", destination: "/api/v1/:path*" }];
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
  ],
};

export default nextConfig;
