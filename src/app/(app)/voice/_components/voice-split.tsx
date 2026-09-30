"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { ListChecks, BellRing, Lightbulb, KeyRound, Mic } from "lucide-react";
import { dayLabel } from "../../_components/local-time";
import LocalTime from "../../_components/local-time";
import { useEffect, useState } from "react";

export type VoiceRow = {
  id: string;
  summary: string;
  source: string;
  isRead: boolean;
  receivedAt: Date;
  tasks: number;
  reminders: number;
  ideas: number;
};

function Counts({ r }: { r: VoiceRow }) {
  const items = [
    r.tasks > 0 && { icon: ListChecks, text: `${r.tasks} task${r.tasks === 1 ? "" : "s"}` },
    r.reminders > 0 && { icon: BellRing, text: `${r.reminders} reminder${r.reminders === 1 ? "" : "s"}` },
    r.ideas > 0 && { icon: Lightbulb, text: `${r.ideas} idea${r.ideas === 1 ? "" : "s"}` },
  ].filter(Boolean) as { icon: typeof ListChecks; text: string }[];
  if (!items.length) return <span className="text-[13px] font-semibold text-[#6B645D]">Nothing to action</span>;
  return (
    <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] font-semibold text-[#4F4943]">
      {items.map(({ icon: Icon, text }) => (
        <span key={text} className="flex items-center gap-1.5">
          <Icon className="w-[15px] h-[15px]" />
          {text}
        </span>
      ))}
    </span>
  );
}

// Notes | Ideas switch shared by /voice and /ideas.
export function CaptureTabs({ active }: { active: "notes" | "ideas" }) {
  const base = "flex h-[38px] items-center justify-center rounded-xl px-5 text-sm font-semibold";
  return (
    <nav
      aria-label="Capture"
      className="grid grid-cols-2 gap-1 rounded-2xl border border-black/[0.07] bg-white p-1 lg:inline-grid"
    >
      <Link
        href="/voice"
        aria-current={active === "notes" ? "page" : undefined}
        className={`${base} ${active === "notes" ? "bg-midnight text-white" : "text-[#4F4943] hover:bg-cream"}`}
      >
        Notes
      </Link>
      <Link
        href="/ideas"
        aria-current={active === "ideas" ? "page" : undefined}
        className={`${base} ${active === "ideas" ? "bg-midnight text-white" : "text-[#4F4943] hover:bg-cream"}`}
      >
        Ideas
      </Link>
    </nav>
  );
}

export default function VoiceSplit({ rows, children }: { rows: VoiceRow[]; children: React.ReactNode }) {
  const selected = useSelectedLayoutSegment(); // note id, or null on /voice
  const onDetail = selected !== null;

  // Day headings use the viewer's clock (client-only).
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- viewer-timezone grouping is client-only by design
    setLabels(Object.fromEntries(rows.map((r) => [r.id, dayLabel(new Date(r.receivedAt), now)])));
  }, [rows]);

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className={`items-center justify-between gap-3 ${onDetail ? "hidden lg:flex" : "flex"}`}>
        <div className="flex-1 lg:flex-none">
          <CaptureTabs active="notes" />
        </div>
        <Link
          href="/profile#voice-key"
          aria-label="Voice key"
          className="flex h-11 items-center gap-2 rounded-[14px] border border-black/10 bg-white px-3.5 text-sm font-semibold hover:border-brand/40"
        >
          <KeyRound className="w-4 h-4" />
          <span className="hidden sm:inline">Voice key</span>
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-5">
        {/* List — the whole screen on phones (index), left pane on desktop */}
        <section
          aria-label="Voice notes"
          className={`${onDetail ? "hidden lg:flex" : "flex"} flex-col gap-2.5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:gap-1 lg:overflow-y-auto lg:rounded-[22px] lg:border lg:border-black/[0.07] lg:bg-white lg:p-2.5`}
        >
          {rows.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-black/15 bg-white p-6 text-center lg:border-0">
              <Mic className="mx-auto mb-2 w-7 h-7 text-brand" />
              <p className="font-semibold">No voice notes yet</p>
              <p className="mt-1 text-sm text-[#6B645D]">
                Add your voice key to the iPhone Shortcut and record one — it will show up here.
              </p>
            </div>
          )}
          {rows.map((r, i) => {
            const label = labels[r.id];
            const showHeading = label && (i === 0 || labels[rows[i - 1].id] !== label);
            const active = r.id === selected;
            return (
              <div key={r.id} className="contents">
                {showHeading && (
                  <h2 className="mt-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#6B645D] first:mt-0 lg:px-3 lg:pt-2">
                    {label}
                  </h2>
                )}
                <Link
                  href={`/voice/${r.id}`}
                  aria-current={active ? "true" : undefined}
                  className={`flex flex-col gap-2 rounded-[22px] border p-4 transition-colors lg:rounded-2xl lg:border-0 ${
                    active ? "border-brand/30 bg-[#FFF1E6]" : "border-black/[0.07] bg-white hover:bg-cream"
                  }`}
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-[#6B645D]">
                    {!r.isRead && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Unread" />}
                    <span className="flex-1">
                      <LocalTime date={r.receivedAt} format="time" /> · <span className="capitalize">{r.source}</span>
                    </span>
                    {!r.isRead && (
                      <span className="rounded-[7px] bg-brand-pale px-[7px] py-[3px] text-[11px] font-bold text-[#8A3200]">
                        New
                      </span>
                    )}
                  </span>
                  <span className="text-base font-semibold leading-snug">
                    {r.summary || "Untitled voice note"}
                  </span>
                  <Counts r={r} />
                </Link>
              </div>
            );
          })}
        </section>

        {/* Detail — its own screen on phones, right pane on desktop */}
        <div className={onDetail ? "block" : "hidden lg:block"}>{children}</div>
      </div>
    </div>
  );
}
