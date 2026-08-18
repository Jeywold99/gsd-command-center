"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { TIMEZONES } from "@/lib/timezones";

const MANILA = "Asia/Manila";

// Home base + the client zones, stacked. Manila is flagged as "home".
const CLOCKS = [
  ...TIMEZONES.map((t) => ({ value: t.value, short: t.short, home: false })),
  { value: MANILA, short: "Manila (home)", home: true },
];

function fmtDate(zone: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

function fmtTime(zone: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
}

function fmtDateTime(zone: string, date: Date): string {
  const d = fmtDate(zone, date);
  const t = fmtTime(zone, date);
  return d && t ? `${d}, ${t}` : "";
}

// Milliseconds that `zone` is ahead of UTC at the given instant.
function zoneOffset(zone: string, date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - date.getTime();
}

// Interpret a wall-clock time (Y/M/D H:M) that is local to `zone`, returning the
// absolute instant. Handles DST via the zone's offset at that time.
function wallTimeToInstant(
  zone: string,
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = zoneOffset(zone, new Date(guess));
  return new Date(guess - offset);
}

// Current wall-clock time in `zone` as a datetime-local value ("YYYY-MM-DDTHH:mm").
function nowInZone(zone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export default function WorldClocks() {
  const [now, setNow] = useState<Date | null>(null);
  const [srcZone, setSrcZone] = useState<string>(TIMEZONES[0].value);
  const [when, setWhen] = useState(""); // datetime-local wall time in srcZone

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const iv = setInterval(tick, 15000);
    return () => clearInterval(iv);
  }, []);

  // Seed the converter with "now" in the default source zone once mounted.
  useEffect(() => {
    const seed = () => setWhen(nowInZone(TIMEZONES[0].value));
    seed();
  }, []);

  const srcShort =
    TIMEZONES.find((t) => t.value === srcZone)?.short ?? srcZone;

  const manilaOut = useMemo(() => {
    const m = when.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return "";
    const [, y, mo, d, h, mi] = m.map(Number);
    const instant = wallTimeToInstant(srcZone, y, mo, d, h, mi);
    return fmtDateTime(MANILA, instant);
  }, [when, srcZone]);

  return (
    <div>
      {/* Live clocks, stacked */}
      <div className="space-y-2">
        {CLOCKS.map((z) => (
          <div
            key={z.value}
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
              z.home
                ? "border-brand/30 bg-brand-pale/60"
                : "border-black/[0.06] bg-cream/60"
            }`}
          >
            <div className="min-w-0">
              <p
                className={`text-sm font-extrabold uppercase tracking-wide ${
                  z.home ? "text-brand" : "text-ink"
                }`}
              >
                {z.short}
              </p>
              <p className="text-[11px] text-ink/50">{now ? fmtDate(z.value, now) : "—"}</p>
            </div>
            <p className="font-display text-2xl tracking-wide text-ink tabular-nums leading-none">
              {now ? fmtTime(z.value, now) : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Convert to Manila */}
      <div className="mt-4 border-t border-black/[0.06] pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/45">
            Convert to Manila
          </p>
          <button
            type="button"
            onClick={() => setWhen(nowInZone(srcZone))}
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            Now
          </button>
        </div>

        <div className="space-y-2">
          <select
            value={srcZone}
            onChange={(e) => setSrcZone(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-lg px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-lg px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />

          <div className="flex items-center gap-2 rounded-xl bg-cream/60 border border-black/[0.06] px-3 py-2.5 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40 shrink-0">
              {srcShort}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-ink/30 shrink-0" />
            <span className="min-w-0 flex-1 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wide text-brand block">
                Manila
              </span>
              <span className="text-ink font-semibold">{manilaOut || "—"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
