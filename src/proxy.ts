import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Next.js 16: "Proxy" is the renamed Middleware. Used here only for OPTIMISTIC
// redirects (cookie read, no DB). Real authorization is enforced in the DAL.

const PUBLIC_ROUTES = ["/login"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
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

// Run on all routes except API, Next internals, and static assets.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
