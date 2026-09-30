"use client";

import { useEffect, useState } from "react";

// Formats a timestamp in the VIEWER's time zone. The server (a Pi, likely on
// UTC) renders a neutral placeholder; the real text appears after hydration,
// so there's no server/client mismatch and no wrong-zone flash.

export type TimeFormat = "time" | "date" | "datetime" | "weekday" | "relative";

function format(d: Date, f: TimeFormat): string {
  switch (f) {
    case "time":
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    case "date":
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    case "weekday":
      return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    case "datetime":
      return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    case "relative": {
      const mins = Math.round((Date.now() - d.getTime()) / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins} min ago`;
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
  }
}

export default function LocalTime({
  date,
  format: f = "datetime",
  className,
}: {
  date: Date | string;
  format?: TimeFormat;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const iso = typeof date === "string" ? date : date.toISOString();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- viewer-timezone text is client-only by design
    setText(format(new Date(iso), f));
  }, [iso, f]);
  return (
    <time dateTime={iso} className={className}>
      {text ?? " "}
    </time>
  );
}

// "Today" / "Yesterday" / "Mon, Sep 28" for grouping lists by day (client only).
export function dayLabel(d: Date, now = new Date()): string {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}
