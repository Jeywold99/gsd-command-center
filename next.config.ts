import type { NextConfig } from "next";

// Behind the Cloudflare Tunnel the browser's Origin is the public domain while
// the app sees a proxied Host, so Server Actions need the domain allow-listed.
// Set GSD_ALLOWED_ORIGIN to your tunnel hostname(s), comma-separated.
const allowedOrigins = process.env.GSD_ALLOWED_ORIGIN
  ? process.env.GSD_ALLOWED_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : undefined;

const nextConfig: NextConfig = {
  experimental: {
    // Uploads POST to a page route, which runs proxy.ts (middleware) first — and
    // the proxy has its OWN body cap (default 10MB) that truncates the request
    // before the Server Action runs (symptom: "Unexpected end of form" → 500).
    // Must be raised alongside serverActions.bodySizeLimit for large uploads.
    proxyClientMaxBodySize: "100mb",
    serverActions: {
      // Max upload size for Server Actions (Vault docs, task attachments, and
      // Notes media incl. video). Default is 1MB. Server Actions buffer the
      // whole body in memory, so on the 4GB Pi keep this sane — 100MB covers
      // short videos/screen-recordings; for anything larger, paste a link via
      // the media block's "Embed" tab instead of uploading.
      bodySizeLimit: "100mb",
      ...(allowedOrigins ? { allowedOrigins } : {}),
    },
  },
};

export default nextConfig;
