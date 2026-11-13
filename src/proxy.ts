import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";
import { portalSlugFromHost } from "@/lib/portal/session";

// Next.js 16: "Proxy" is the renamed Middleware. Used here only for OPTIMISTIC
// redirects (cookie read, no DB). Real authorization is enforced in the DAL.

const PUBLIC_ROUTES = ["/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Client portals live on their own host (nathan.<domain>, or
  // nathan.localhost in dev) and are served from /portal/<slug>/*. The portal
  // runs its own sign-in, so none of the team redirects below apply to it.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const slug = portalSlugFromHost(host);
  if (slug) {
    const url = req.nextUrl.clone();
    url.pathname = `/portal/${slug}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }
  // On the team host the portal routes don't exist.
  if (path === "/portal" || path.startsWith("/portal/")) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  const isPublic = PUBLIC_ROUTES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);

  // Not logged in and trying to reach a protected page → send to login.
  if (!isPublic && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Already logged in but on a public (login) page → send home.
  if (isPublic && session?.userId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

// Run on all routes except API, Next internals, static assets, and the PWA
// files (the manifest and service worker must load without a session).
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
