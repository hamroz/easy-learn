import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Lets the e2e server build into its own folder while a dev server is running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
