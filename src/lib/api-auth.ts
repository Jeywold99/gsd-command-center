import "server-only";
import { cookies } from "next/headers";
import { decrypt, SESSION_COOKIE } from "./session";

// Session check for API route handlers: reads the session cookie and returns
// the payload, or null. Unlike the DAL's `verifySession` (which redirects to
// /login), this never redirects — API routes must return a 401 themselves.
export async function getSessionFromCookie() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decrypt(token);
}
