// Small presentational helpers, usable from server components.

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-[#e7f8f1] text-[#0e7a52] border-success/40" },
  PAUSED: { label: "Paused", cls: "bg-[#fff7e6] text-[#b45309] border-amber-400/40" },
  CHURNED: { label: "Churned", cls: "bg-black/5 text-black/50 border-black/15" },
  LEAD: { label: "Lead", cls: "bg-brand-pale text-[#c74600] border-brand/40" },
};

const STAGE: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-black/5 text-black/50 border-black/15" };
  return (
    <span
      className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function StageLabel({ stage }: { stage: string }) {
  return <>{STAGE[stage] ?? stage}</>;
}

// health is auto-computed unless the client has a manual override set (see
// lib/health.ts) — reasons show on hover via the title attribute so the flag
// is never a mystery.
export function HealthDot({
  health,
  reasons,
  isOverride,
}: {
  health: string;
  reasons?: string[];
  isOverride?: boolean;
}) {
  const color =
    health === "GREEN" ? "bg-success" : health === "YELLOW" ? "bg-amber-400" : "bg-red-500";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-black/50"
      title={reasons?.join(" · ")}
    >
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {health.charAt(0) + health.slice(1).toLowerCase()}
      {!isOverride && <span className="text-[9px] text-black/30 uppercase tracking-wide">Auto</span>}
    </span>
  );
}

export const PIPELINE_STAGES = [
  "NEW",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

// Re-exported from the shared util so existing importers keep working.
export { fmtDate } from "@/lib/format";
