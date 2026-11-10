import Link from "next/link";

export type Chip = { label: string; href: string; active: boolean; count?: number };

// A row of pill links used as filters (person, status group). Plain links, so the URL holds the filter.
export default function FilterChips({ chips, label }: { chips: Chip[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          aria-current={c.active ? "true" : undefined}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition ${
            c.active
              ? "border-midnight bg-midnight text-white"
              : "border-black/10 bg-white text-ink/70 hover:border-brand/50 hover:text-ink"
          }`}
        >
          {c.label}
          {c.count != null && <span className={`text-xs ${c.active ? "text-white/70" : "text-[#6B645D]"}`}>{c.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
