import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@node-rs/argon2", "isomorphic-dompurify", "jsdom", "postgres"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Custom widgets run in sandboxed (opaque-origin) iframes; ES module imports need CORS.
        source: "/widget-libs/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
