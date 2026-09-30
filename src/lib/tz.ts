// The team's home time zone for server-side "today" math (the Pi runs on UTC).
// Override with APP_TIMEZONE (IANA name). Display formatting still happens in
// the viewer's browser (see _components/local-time.tsx).
export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Manila";

// Offset (ms) of `tz` from UTC at instant `d`.
function offsetMs(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

// Today in `tz`:
//   start/end — the real instants bounding the local day (for timed things)
//   dateStart/dateEnd — UTC midnights of that calendar date, which is how
//   date-only due dates are stored ("2026-10-02" → 2026-10-02T00:00Z)
export function todayRange(now = new Date(), tz = APP_TZ) {
  const local = new Date(now.getTime() + offsetMs(now, tz));
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const day = local.getUTCDate();
  const dateStart = new Date(Date.UTC(y, m, day));
  const dateEnd = new Date(Date.UTC(y, m, day + 1));
  const start = new Date(dateStart.getTime() - offsetMs(dateStart, tz));
  const end = new Date(dateEnd.getTime() - offsetMs(dateEnd, tz));
  return { start, end, dateStart, dateEnd };
}
