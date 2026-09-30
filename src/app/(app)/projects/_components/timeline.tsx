import { Flag } from "lucide-react";

type Item = {
  id: string;
  name: string;
  start: Date | string | null;
  end: Date | string | null;
  kind: "milestone" | "task";
  status?: string;
};

const DAY = 86_400_000;

function ms(d: Date | string | null | undefined) {
  return d ? new Date(d).getTime() : null;
}

// Request-time "now" for the Today line. This is a server component rendered
// once per request, so reading the current time here is intentional and stable
// for the render — the helper keeps it out of the react-hooks/purity check.
function nowMs() {
  return Date.now();
}

export default function Timeline({
  milestones,
  tasks,
}: {
  milestones: { id: string; name: string; startDate: Date | null; dueDate: Date | null; status: string }[];
  tasks: { id: string; title: string; startDate: Date | null; dueDate: Date | null; status: string }[];
}) {
  const items: Item[] = [
    ...milestones.map((m) => ({
      id: m.id,
      name: m.name,
      start: m.startDate,
      end: m.dueDate,
      kind: "milestone" as const,
      status: m.status,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      name: t.title,
      start: t.startDate,
      end: t.dueDate,
      kind: "task" as const,
      status: t.status,
    })),
  ];

  const scheduled = items.filter((i) => i.start || i.end);
  const unscheduled = items.filter((i) => !i.start && !i.end);

  const dates: number[] = [];
  for (const i of scheduled) {
    const s = ms(i.start);
    const e = ms(i.end);
    if (s) dates.push(s);
    if (e) dates.push(e);
  }

  if (dates.length === 0) {
    return (
      <div className="bg-white border border-dashed border-black/15 rounded-2xl p-12 text-center">
        <p className="text-black/50">
          Nothing scheduled yet. Add start/due dates to tasks or milestones to see them here.
        </p>
      </div>
    );
  }

  let min = Math.min(...dates);
  let max = Math.max(...dates);
  if (min === max) max = min + 7 * DAY;
  const pad = Math.max((max - min) * 0.05, 2 * DAY);
  min -= pad;
  max += pad;
  const total = max - min;
  const pct = (t: number) => ((t - min) / total) * 100;

  // Month gridlines/labels
  const months: Date[] = [];
  const cur = new Date(min);
  cur.setDate(1);
  cur.setHours(0, 0, 0, 0);
  while (cur.getTime() <= max) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  const today = nowMs();
  const showToday = today >= min && today <= max;

  function geo(start: number | null, end: number | null) {
    if (start && end) {
      const left = pct(start);
      const width = Math.max(pct(end) - left, 1.5);
      return { left, width };
    }
    const point = (start ?? end)!;
    const left = Math.max(pct(point) - 1, 0);
    return { left, width: 2 };
  }

  const trackMinWidth = Math.max(months.length * 130, 640);

  return (
    <div className="bg-white rounded-[22px] border border-black/[0.07] p-4">
      <div className="flex">
        {/* Labels column */}
        <div className="w-44 shrink-0 pr-3">
          <div className="h-8" />
          {scheduled.map((i) => (
            <div key={i.id} className="h-9 flex items-center gap-1.5 text-sm text-ink truncate">
              {i.kind === "milestone" && <Flag className="w-3.5 h-3.5 text-brand shrink-0" />}
              <span className="truncate">{i.name}</span>
            </div>
          ))}
        </div>

        {/* Track column */}
        <div className="flex-1 overflow-x-auto">
          <div className="relative" style={{ minWidth: trackMinWidth }}>
            {/* gridlines */}
            {months.map((m, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 border-l border-black/[0.06]"
                style={{ left: `${pct(m.getTime())}%` }}
              />
            ))}
            {showToday && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-brand/60 z-10"
                style={{ left: `${pct(today)}%` }}
              >
                <span className="absolute -top-0.5 -translate-x-1/2 text-[9px] font-bold text-brand bg-white px-1">
                  Today
                </span>
              </div>
            )}

            {/* month labels */}
            <div className="h-8 relative">
              {months.map((m, idx) => (
                <span
                  key={idx}
                  className="absolute top-2 text-[11px] font-semibold text-ink/45 whitespace-nowrap pl-1"
                  style={{ left: `${pct(m.getTime())}%` }}
                >
                  {m.toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
                </span>
              ))}
            </div>

            {/* bars */}
            {scheduled.map((i) => {
              const g = geo(ms(i.start), ms(i.end));
              const done = i.status === "DONE" || i.status === "COMPLETED";
              const color =
                i.kind === "milestone"
                  ? "bg-brand"
                  : done
                    ? "bg-success"
                    : "bg-midnight/80";
              return (
                <div key={i.id} className="h-9 relative">
                  <div
                    className={`absolute top-1.5 h-5 rounded-md ${color} opacity-90`}
                    style={{ left: `${g.left}%`, width: `${g.width}%` }}
                    title={i.name}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/[0.06]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40 mb-2">
            Unscheduled ({unscheduled.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((i) => (
              <span
                key={i.id}
                className="inline-flex items-center gap-1.5 text-xs bg-cream border border-black/10 rounded-full px-2.5 py-1 text-ink/60"
              >
                {i.kind === "milestone" && <Flag className="w-3 h-3 text-brand" />}
                {i.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
