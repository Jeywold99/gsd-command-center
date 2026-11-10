import { STATUS_LABEL, isStatus, type Status } from "@/lib/pipeline/types";

// Chip colours per status (kept in the GSD palette: orange for "someone replied", green for good news).
export const STATUS_CHIP: Record<Status, string> = {
  lead: "bg-black/[0.06] text-ink/70",
  drafting: "bg-community/10 text-community",
  applied: "bg-midnight/10 text-midnight",
  viewed: "bg-sky-100 text-sky-800",
  replied: "bg-brand-pale text-[#B34100]",
  interview: "bg-brand text-ink",
  trial_task: "bg-amber-100 text-amber-900",
  offer: "bg-success/15 text-[#0B7A52]",
  hired: "bg-success text-white",
  rejected: "bg-red-100 text-red-700",
  ghosted: "bg-black/[0.08] text-ink/55",
  withdrawn: "bg-black/[0.06] text-ink/55",
  offer_declined: "bg-black/[0.06] text-ink/55",
  on_hold: "bg-amber-50 text-amber-800",
};

// Dot colour used in board column headers.
export const STATUS_DOT: Record<Status, string> = {
  lead: "bg-black/30",
  drafting: "bg-community",
  applied: "bg-midnight",
  viewed: "bg-sky-500",
  replied: "bg-brand-hover",
  interview: "bg-brand",
  trial_task: "bg-amber-500",
  offer: "bg-success",
  hired: "bg-success",
  rejected: "bg-red-500",
  ghosted: "bg-black/30",
  withdrawn: "bg-black/30",
  offer_declined: "bg-black/30",
  on_hold: "bg-amber-400",
};

export default function StatusChip({ status, className = "" }: { status: string; className?: string }) {
  const known = isStatus(status);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
        known ? STATUS_CHIP[status] : "bg-black/[0.06] text-ink/70"
      } ${className}`}
    >
      {known ? STATUS_LABEL[status] : status}
    </span>
  );
}
