import type { LucideIcon } from "lucide-react";

// Branded "coming soon" block for feature routes not yet built,
// showing which phase each feature lands in.
export default function Placeholder({
  icon: Icon,
  phase,
  title,
  description,
}: {
  icon: LucideIcon;
  phase: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 lg:py-24 px-6">
      <div className="w-16 h-16 rounded-2xl bg-brand-pale text-brand flex items-center justify-center mb-5">
        <Icon className="w-8 h-8" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
        {phase}
      </span>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink">{title}</h1>
      <p className="mt-3 text-black/50 max-w-md">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream border border-black/10 px-4 py-1.5 text-xs font-semibold text-ink/60">
        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
        Coming soon
      </span>
    </div>
  );
}
