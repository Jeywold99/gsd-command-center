"use client";

import { useState, useEffect } from "react";
import { Play, Square } from "lucide-react";
import { startTimer, stopTimer } from "../actions";

type Running = {
  startedAt: string | Date;
  note: string | null;
  project: { name: string; client: { companyName: string } | null } | null;
} | null;

type ProjectOpt = { id: string; name: string; client: { companyName: string } | null };

function clock(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function Timer({
  running,
  projects,
}: {
  running: Running;
  projects: ProjectOpt[];
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = new Date(running.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [running]);

  if (running) {
    return (
      <div className="bg-midnight text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Timer running
          </div>
          <p className="mt-2 text-white/80">
            {running.project?.client?.companyName
              ? `${running.project.client.companyName} · `
              : ""}
            {running.project?.name ?? "—"}
          </p>
          {running.note && <p className="text-sm text-white/50">{running.note}</p>}
        </div>
        <div className="flex items-center gap-5">
          <span className="font-display text-5xl tracking-wider tabular-nums">{clock(elapsed)}</span>
          <form action={stopTimer}>
            <button
              type="submit"
              className="min-h-11 inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-ink font-bold px-5 py-2.5 rounded-[14px] transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form
      action={startTimer}
      className="bg-white rounded-[22px] border border-black/[0.07] p-5 flex flex-wrap items-end gap-3"
    >
      <div className="w-56">
        <label className="block text-xs font-semibold text-[#6B645D] mb-1.5">
          Project
        </label>
        <select
          name="projectId"
          required
          defaultValue=""
          className="w-full bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="" disabled>
            Select project…
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.client ? `${p.client.companyName} · ` : ""}
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-semibold text-[#6B645D] mb-1.5">
          Note
        </label>
        <input
          name="note"
          placeholder="What are you working on?"
          className="w-full bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <button
        type="submit"
        className="min-h-11 inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-ink font-bold px-5 py-2.5 rounded-[14px] transition-colors"
      >
        <Play className="w-4 h-4" />
        Start Timer
      </button>
    </form>
  );
}
