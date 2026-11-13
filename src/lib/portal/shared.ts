// Portal helpers safe for both server and client components (no server-only).

export type PStatus = "PLANNED" | "IN_PROGRESS" | "WAITING" | "NEEDS_CLIENT" | "DONE";

export const STATUS_ORDER: PStatus[] = ["NEEDS_CLIENT", "IN_PROGRESS", "WAITING", "PLANNED", "DONE"];

// The five statuses from the design, with their pill colours.
export const STATUS_META: Record<PStatus, { fg: string; bg: string; rule: string }> = {
  PLANNED: { fg: "#374151", bg: "#F3F4F6", rule: "Scheduled for this month, not started." },
  IN_PROGRESS: { fg: "#1D4ED8", bg: "#DBEAFE", rule: "Being worked on now." },
  WAITING: { fg: "#92400E", bg: "#FEF3C7", rule: "Blocked by someone else. Names who, with a chase date." },
  NEEDS_CLIENT: { fg: "#9A3412", bg: "#FFEDD5", rule: "Only your approval, decision or signature moves it." },
  DONE: { fg: "#065F46", bg: "#D1FAE5", rule: "Finished, with a one-line outcome." },
};

export function statusLabel(s: PStatus, firstName: string): string {
  switch (s) {
    case "PLANNED":
      return "Planned";
    case "IN_PROGRESS":
      return "In progress";
    case "WAITING":
      return "Waiting on";
    case "NEEDS_CLIENT":
      return `Needs ${firstName}`;
    case "DONE":
      return "Done";
  }
}

export const ASK_TYPES = ["APPROVE", "DECIDE", "SIGN"] as const;

// ── Months ───────────────────────────────────────────────────────────────────
// Date-only fields (month, dueDate, chaseDate) are stored at UTC midnight, so
// they're read in UTC. Timestamps (completedAt) are read in the client's zone.

export function monthKey(d: Date | string): string {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthOfDate(d: Date | string, tz = "America/New_York"): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).formatToParts(new Date(d));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export function todayKey(tz = "America/New_York"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()); // YYYY-MM-DD
}

export function isMonthKey(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return monthKey(d);
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
  });
}

export function monthStart(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

// "Fri Nov 20"
export function fmtDay(d: Date | string | null | undefined): string {
  if (!d) return "No date";
  return new Date(d).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

// "Fri Nov 20" for a timestamp, in the client's time zone.
export function fmtDayTz(d: Date | string | null | undefined, tz = "America/New_York"): string {
  if (!d) return "No date";
  return new Date(d).toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
}

// "Nov 20"
export function fmtShort(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
}

// For timestamps: "Nov 12, 9:14 AM ET"
export function fmtStamp(d: Date | string, tz = "America/New_York"): string {
  const s = new Date(d).toLocaleString("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${s} ET`;
}

// A due date means 5:00 PM Eastern on that day. Shows the Manila equivalent
// for the EA team: "Sat 6:00 AM Manila".
export function manilaForDue(d: Date | string): string {
  const day = new Date(d);
  // 5 PM ET is 21:00 or 22:00 UTC depending on daylight saving; find which.
  for (const utcHour of [21, 22]) {
    const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), utcHour));
    const etHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(t));
    if (etHour === 17) {
      return t.toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: "short", hour: "numeric", minute: "2-digit" }) + " Manila";
    }
  }
  return "";
}

export function dateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

// Tag style for a business colour.
export function tint(hex: string | null | undefined): { color: string; background: string } {
  const c = hex || "#374151";
  return { color: c, background: `${c}1A` };
}
