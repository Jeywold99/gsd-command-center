import "server-only";

// Simple lockout: 5 wrong passwords or codes for one account → 15 minutes off.
// In memory (one web container), so a restart clears it; that's acceptable here.
const failures = new Map<string, { n: number; until: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

export const LOCKED = "Too many tries. Wait 15 minutes, then try again.";

export function isLocked(key: string) {
  const f = failures.get(key);
  return !!f && f.until > Date.now();
}

// Records a failure; true when this one locks the account.
export function recordFail(key: string): boolean {
  const f = failures.get(key);
  const n = (f && f.until <= Date.now() && f.n >= MAX_FAILS ? 0 : (f?.n ?? 0)) + 1;
  failures.set(key, { n, until: n >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
  return n >= MAX_FAILS;
}

export function clearFails(key: string) {
  failures.delete(key);
}
