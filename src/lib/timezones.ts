// Client time zones the team works across. Stored as IANA identifiers so the
// live clocks stay correct through daylight-saving changes; labelled with the
// abbreviations the team actually uses (EST / MST / PDT).
export const TIMEZONES = [
  { value: "America/New_York", label: "EST — Eastern", short: "EST" },
  { value: "America/Denver", label: "MST — Mountain", short: "MST" },
  { value: "America/Los_Angeles", label: "PDT — Pacific", short: "PDT" },
] as const;

export type TimezoneValue = (typeof TIMEZONES)[number]["value"];

// Short label for a stored IANA value (falls back to the raw value).
export function tzShort(value: string | null | undefined): string {
  if (!value) return "";
  return TIMEZONES.find((t) => t.value === value)?.short ?? value;
}

// Current time in a zone as "h:mm AM" — returns "" if the zone is unknown.
export function tzTime(value: string, date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: value,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
}
