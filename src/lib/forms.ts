// Shared FormData parsing helpers used by server actions. Kept dependency-free
// so any "use server" file can import them without pulling in server-only deps.

// Trimmed string, or null when empty/missing.
export function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

// Valid Date parsed from a form value, or null when empty/unparseable.
export function date(v: FormDataEntryValue | null): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
