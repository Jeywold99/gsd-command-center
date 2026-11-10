// Date helpers for the Pipeline section. Everything is rendered in the team's zone with a fixed locale,
// so server-rendered HTML and client hydration always agree. Works on server and client.

import { APP_TZ } from "@/lib/tz";
import { STATUS_LABEL, isStatus } from "./types";

const LOCALE = "en-US";

// "Acme · Virtual Assistant (Applied)" for pickers.
export function optionLabel(company: string, role: string, status: string): string {
  const s = isStatus(status) ? STATUS_LABEL[status] : status;
  return `${company} · ${role} (${s})`;
}

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

function valid(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// "Nov 11"
export function fmtDay(iso: string | null | undefined): string {
  const d = valid(iso);
  if (!d) return "—";
  return d.toLocaleDateString(LOCALE, { timeZone: APP_TZ, month: "short", day: "numeric" });
}

// "Nov 11, 3:30 PM"
export function fmtDayTime(iso: string | null | undefined): string {
  const d = valid(iso);
  if (!d) return "—";
  return d.toLocaleString(LOCALE, {
    timeZone: APP_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "3 days ago" style, relative to now.
export function ago(iso: string | null | undefined, now = Date.now()): string {
  const d = valid(iso);
  if (!d) return "—";
  const mins = Math.floor((now - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return fmtDay(iso);
}

// In how long / how late, for due dates: "in 2d", "today", "3d late".
export function dueIn(iso: string | null | undefined, now = Date.now()): { label: string; late: boolean; soon: boolean } {
  const d = valid(iso);
  if (!d) return { label: "", late: false, soon: false };
  const diffH = (d.getTime() - now) / 3_600_000;
  if (diffH < 0) {
    const days = Math.floor(-diffH / 24);
    return { label: days < 1 ? "overdue" : `${days}d late`, late: true, soon: false };
  }
  if (diffH < 24) return { label: "today", late: false, soon: true };
  const days = Math.floor(diffH / 24);
  return { label: `in ${days}d`, late: false, soon: days <= 2 };
}

// ISO -> value for <input type="datetime-local"> in the team zone ("2026-11-11T15:30"), or "".
export function toInputLocal(iso: string | null | undefined): string {
  const d = valid(iso);
  if (!d) return "";
  return new Date(d.getTime() + offsetMs(d, APP_TZ)).toISOString().slice(0, 16);
}

// <input type="datetime-local"> / <input type="date"> value (team zone) -> ISO instant, or null.
export function fromInputLocal(v: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec((v ?? "").trim());
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
  const d = new Date(guess - offsetMs(new Date(guess), APP_TZ));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function pct(rate: number | null | undefined): string {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}
