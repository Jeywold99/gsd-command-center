"use client";

import { useEffect, useState } from "react";
import { tzShort, tzTime } from "@/lib/timezones";

// A small live clock for a client's local time. Ticks every 15s (enough for
// minute precision) and is safe against unknown zones.
export default function ClientClock({
  timezone,
  className = "",
}: {
  timezone: string | null;
  className?: string;
}) {
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!timezone) return;
    const tick = () => setTime(tzTime(timezone));
    tick();
    const iv = setInterval(tick, 15000);
    return () => clearInterval(iv);
  }, [timezone]);

  if (!timezone) return <span className="text-ink/30">—</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40">
        {tzShort(timezone)}
      </span>
      <span className="tabular-nums text-ink/70">{time}</span>
    </span>
  );
}
