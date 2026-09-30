// Priority pill in the redesign's palette (colors differ in lightness too, not
// just hue, so they stay distinguishable).
const STYLES: Record<string, { label: string; cls: string }> = {
  URGENT: { label: "Urgent", cls: "bg-[#FFE1E1] text-[#B42318]" },
  HIGH: { label: "High", cls: "bg-brand-pale text-[#8A3200]" },
  MEDIUM: { label: "Medium", cls: "bg-[#ECE7FB] text-[#5B3FC4]" },
  LOW: { label: "Low", cls: "bg-[#EAE6E1] text-[#4F4943]" },
};

export default function PriorityChip({ priority }: { priority: string }) {
  const s = STYLES[priority] ?? STYLES.MEDIUM;
  return (
    <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
  );
}
