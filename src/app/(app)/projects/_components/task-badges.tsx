import { fmtDate as fmtDateFull } from "@/lib/format";

export const COLUMNS = [
  { status: "TODO", label: "To Do" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "IN_REVIEW", label: "In Review" },
  { status: "DONE", label: "Done" },
] as const;

export const PRIORITY: Record<string, { label: string; cls: string; dot: string }> = {
  LOW: { label: "Low", cls: "text-black/40", dot: "bg-black/25" },
  MEDIUM: { label: "Medium", cls: "text-sky-700", dot: "bg-sky-500" },
  HIGH: { label: "High", cls: "text-amber-700", dot: "bg-amber-500" },
  URGENT: { label: "Urgent", cls: "text-red-700", dot: "bg-red-500" },
};

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  PLANNING: { label: "Planning", cls: "bg-cream text-ink/60 border-black/10" },
  ACTIVE: { label: "Active", cls: "bg-[#e7f8f1] text-[#0e7a52] border-success/40" },
  ON_HOLD: { label: "On Hold", cls: "bg-[#fff7e6] text-[#b45309] border-amber-400/40" },
  COMPLETED: { label: "Completed", cls: "bg-[#ede9fe] text-[#6d28d9] border-community/40" },
  ARCHIVED: { label: "Archived", cls: "bg-black/5 text-black/50 border-black/15" },
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const s = PROJECT_STATUS[status] ?? { label: status, cls: "bg-black/5 text-black/50 border-black/15" };
  return (
    <span className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: string }) {
  const p = PRIORITY[priority] ?? PRIORITY.MEDIUM;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {p.label}
    </span>
  );
}

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// Compact variant ("Aug 15") for space-tight task cards.
export const fmtDate = (d: Date | string | null | undefined) =>
  fmtDateFull(d, { compact: true });
