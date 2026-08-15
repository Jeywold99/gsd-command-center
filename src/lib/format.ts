// Shared date formatting. Default is the full form ("Aug 15, 2026"); pass
// `{ compact: true }` for the space-tight form ("Aug 15") used on task cards.
export function fmtDate(
  d: Date | string | null | undefined,
  opts?: { compact?: boolean },
): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(
    undefined,
    opts?.compact
      ? { month: "short", day: "numeric" }
      : { year: "numeric", month: "short", day: "numeric" },
  );
}
