import "server-only";

// Full address of a client portal page, for links from the team app.
// Production: https://<slug>.<PORTAL_BASE_DOMAIN>; local dev: http://<slug>.localhost:<port>.
export function portalUrl(slug: string, path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (process.env.NODE_ENV !== "production") {
    return `http://${slug}.localhost:${process.env.PORT || 3000}${p}`;
  }
  const base = process.env.PORTAL_BASE_DOMAIN || "getshtdonehq.com";
  return `https://${slug}.${base}${p}`;
}
