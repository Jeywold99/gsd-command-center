"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { clockIn, stopTimer } from "../time/actions";

function hms(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

// The big time-tracker card on Home (phones mainly; desktop also has the
// compact top-bar button).
export default function HomeClock({
  running,
  label,
}: {
  running: { startedAt: string | Date } | null;
  label: string | null;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!running) return;
    const t0 = new Date(running.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [running]);

  const toggle = () =>
    start(async () => {
      if (running) await stopTimer();
      else await clockIn();
      router.refresh();
    });

  return (
    <section
      aria-label="Time tracker"
      className="flex items-center gap-3.5 rounded-3xl bg-midnight py-4 pr-4 pl-5 text-white"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.13em] text-white/[0.62]">
          {running ? `On the clock${label ? ` · ${label}` : ""}` : "Not clocked in"}
        </p>
        <p className="mt-1 font-display text-[38px] leading-none tracking-wider tabular-nums">
          {running ? hms(elapsed) : "00:00:00"}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="flex h-[46px] shrink-0 items-center gap-2 rounded-[15px] bg-brand px-5 text-[15px] font-bold text-ink transition active:scale-95 disabled:opacity-60"
      >
        {running ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        {running ? "Stop" : "Clock in"}
      </button>
    </section>
  );
}
