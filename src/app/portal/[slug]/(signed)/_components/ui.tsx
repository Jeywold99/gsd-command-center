import Link from "next/link";
import { STATUS_META, statusLabel, tint, fmtShort, type PStatus } from "@/lib/portal/shared";

export function StatusPill({ status, firstName, wide = false }: { status: PStatus; firstName: string; wide?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span className="p-pill" style={{ color: m.fg, background: m.bg, minWidth: wide ? 112 : undefined }}>
      {statusLabel(status, firstName)}
    </span>
  );
}

export function BizTag({ short, color }: { short: string | null | undefined; color: string | null | undefined }) {
  return (
    <span className="p-tag" style={tint(color)}>
      {short ?? "—"}
    </span>
  );
}

export function Dot({ color, size = 10 }: { color: string | null | undefined; size?: number }) {
  return <span className="inline-block flex-none rounded-[3px]" style={{ width: size, height: size, background: color ?? "#374151" }} />;
}

export function ProgressBar({ done, total, color }: { done: number; total: number; color: string | null | undefined }) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <div className="h-1.5 rounded-full bg-[var(--p-line)] overflow-hidden" aria-label={`${done} of ${total} done`}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color ?? "#374151" }} />
    </div>
  );
}

export type RowTask = {
  id: string;
  title: string;
  pstatus: PStatus;
  dueDate: Date | null;
  nextAction: string | null;
  waitingOn: string | null;
  workstream: string | null;
  owner: { name: string } | null;
  carried?: boolean;
};

// One line per task: status, title + next action, owner, due date.
export function TaskRow({ t, firstName, showWorkstream = false }: { t: RowTask; firstName: string; showWorkstream?: boolean }) {
  const sub =
    t.pstatus === "WAITING" && t.waitingOn
      ? `Waiting on ${t.waitingOn}${t.nextAction ? ` · ${t.nextAction}` : ""}`
      : t.nextAction;
  return (
    <Link href={`/t/${t.id}`} className="p-row">
      <span className="hidden sm:inline-flex">
        <StatusPill status={t.pstatus} firstName={firstName} wide />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-semibold truncate">{t.title}</span>
          {t.carried && <span className="p-tag bg-[#F3F4F6] text-[#4B5563] font-semibold">Carried over</span>}
        </span>
        <span className="block text-[13px] p-muted truncate">
          <span className="sm:hidden">
            <StatusPill status={t.pstatus} firstName={firstName} />{" "}
          </span>
          {sub}
          {showWorkstream && t.workstream ? <span className="p-faint"> · {t.workstream}</span> : null}
        </span>
      </span>
      <span className="hidden md:block w-24 text-[13px] p-muted truncate">{t.owner?.name.split(" ")[0] ?? "—"}</span>
      <span className="w-16 text-right text-[13px] font-semibold">{fmtShort(t.dueDate)}</span>
    </Link>
  );
}

export function MonthSwitcher({ month, prev, next, label, base = "" }: { month: string; prev: string; next: string; label: string; base?: string }) {
  void month;
  return (
    <div className="inline-flex items-center gap-1">
      <Link href={`${base}?m=${prev}`} className="p-btn p-btn-sm" aria-label="Previous month">
        ‹
      </Link>
      <span className="px-2 font-semibold min-w-[130px] text-center">{label}</span>
      <Link href={`${base}?m=${next}`} className="p-btn p-btn-sm" aria-label="Next month">
        ›
      </Link>
    </div>
  );
}
