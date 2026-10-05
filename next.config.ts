import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@node-rs/argon2", "isomorphic-dompurify", "jsdom", "postgres"],
  poweredByHeader: false,
};

export default nextConfig;
