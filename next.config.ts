import type { NextConfig } from "next";

// Behind the Cloudflare Tunnel the browser's Origin is the public domain while
// the app sees a proxied Host, so Server Actions need the domain allow-listed.
// Set GSD_ALLOWED_ORIGIN to your tunnel hostname(s), comma-separated.
const allowedOrigins = process.env.GSD_ALLOWED_ORIGIN
  ? process.env.GSD_ALLOWED_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : undefined;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow file uploads through Server Actions (Vault). Default is 1MB.
      bodySizeLimit: "12mb",
      ...(allowedOrigins ? { allowedOrigins } : {}),
    },
  },
};

export default nextConfig;
