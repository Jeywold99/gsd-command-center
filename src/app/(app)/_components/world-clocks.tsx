"use client";

import { useEffect, useState } from "react";
import { TIMEZONES, tzTime } from "@/lib/timezones";

// Live clocks for the time zones the team works across (EST / MST / PDT).
export default function WorldClocks() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const iv = setInterval(tick, 15000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-3">
      {TIMEZONES.map((t) => (
        <div
          key={t.value}
          className="rounded-xl border border-black/[0.06] bg-cream/60 px-3 py-3 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">
            {t.short}
          </p>
          <p className="mt-1 font-display text-2xl tracking-wide text-ink tabular-nums leading-none">
            {now ? tzTime(t.value, now) : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
