import Link from "next/link";
import { Search } from "lucide-react";
import { requirePipelineAccess } from "@/lib/pipeline/access";
import { ago } from "@/lib/pipeline/format";
import { listApplications } from "@/lib/pipeline/queries";
import { ACTIVE_STATUSES, PLATFORM_LABEL, type ApplicationOverview, type Status } from "@/lib/pipeline/types";
import FilterChips from "../_components/filter-chips";
import StatusChip from "../_components/status-chip";
import { btnDark, input } from "../_components/styles";

type Group = "active" | "hired" | "closed" | "all";
const GROUPS: { key: Group; label: string; statuses: Status[] | null }[] = [
  { key: "active", label: "Active", statuses: ACTIVE_STATUSES },
  { key: "hired", label: "Hired", statuses: ["hired"] },
  { key: "closed", label: "Closed", statuses: ["rejected", "ghosted", "withdrawn", "offer_declined"] },
  { key: "all", label: "All", statuses: null },
];

function matches(a: ApplicationOverview, q: string): boolean {
  if (!q) return true;
  const hay = [a.company, a.role, a.contact_name, a.contact_email, a.rate_offered, a.next_action, a.person_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; person?: string; group?: string }>;
}) {
  const viewer = await requirePipelineAccess();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const person = (sp.person ?? "").toLowerCase();
  const group: Group = GROUPS.some((g) => g.key === sp.group) ? (sp.group as Group) : "active";

  const all = await listApplications();
  const names = [...new Set([viewer.person, ...all.map((a) => a.person_name)])];
  const byPerson = person && person !== "all" ? all.filter((a) => a.person_name.toLowerCase() === person) : all;
  const statuses = GROUPS.find((g) => g.key === group)?.statuses ?? null;
  const rows = byPerson.filter((a) => (!statuses || statuses.includes(a.status)) && matches(a, q));

  const href = (over: { group?: string; person?: string }) => {
    const p = new URLSearchParams();
    const g = over.group ?? group;
    const who = over.person ?? person;
    if (g !== "active") p.set("group", g);
    if (who && who !== "all") p.set("person", who);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/pipeline/applications${s ? `?${s}` : ""}`;
  };

  const groupChips = GROUPS.map((g) => ({
    label: g.label,
    href: href({ group: g.key }),
    active: g.key === group,
    count: byPerson.filter((a) => !g.statuses || g.statuses.includes(a.status)).length,
  }));
  const personChips = [
    { label: "Everyone", href: href({ person: "all" }), active: !person || person === "all" },
    ...names.map((n) => ({
      label: n === viewer.person ? `${n} (you)` : n,
      href: href({ person: n.toLowerCase() }),
      active: person === n.toLowerCase(),
    })),
  ];

  return (
    <div className="space-y-4">
      <form action="/pipeline/applications" className="flex gap-2">
        {group !== "active" && <input type="hidden" name="group" value={group} />}
        {person && person !== "all" && <input type="hidden" name="person" value={person} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B645D]" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Search applications
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Search company, role, contact…" className={`${input} pl-10`} />
        </div>
        <button type="submit" className={btnDark}>
          Search
        </button>
      </form>

      <div className="space-y-2">
        <FilterChips chips={groupChips} label="Which applications" />
        <FilterChips chips={personChips} label="Whose applications" />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-black/15 bg-white p-8 text-center text-sm text-[#6B645D]">
          {q ? "Nothing matches that search." : "Nothing here."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-white">
          <div className="hidden grid-cols-[minmax(0,2.4fr)_120px_80px_minmax(0,1fr)_110px_80px] gap-3 border-b border-black/[0.06] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B645D] lg:grid">
            <span>Application</span>
            <span>Status</span>
            <span>Owner</span>
            <span>Rate / platform</span>
            <span>Last activity</span>
            <span className="text-right">To do</span>
          </div>
          <ul className="divide-y divide-black/[0.06]">
            {rows.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/pipeline/applications/${a.id}`}
                  className="grid gap-x-3 gap-y-1.5 px-4 py-3.5 transition hover:bg-cream/60 sm:px-5 lg:grid-cols-[minmax(0,2.4fr)_120px_80px_minmax(0,1fr)_110px_80px] lg:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold text-ink">{a.company}</span>
                    <span className="block truncate text-[13px] text-[#6B645D]">{a.role}</span>
                  </span>
                  <span>
                    <StatusChip status={a.status} />
                  </span>
                  <span className="text-[13px] font-semibold text-ink/70">{a.person_name}</span>
                  <span className="min-w-0 truncate text-[13px] text-[#6B645D]">
                    {[a.rate_offered, a.platform ? (PLATFORM_LABEL[a.platform] ?? a.platform) : null].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="text-[13px] text-[#6B645D]">{ago(a.last_activity_at)}</span>
                  <span className="lg:text-right">
                    {a.missing_count > 0 ? (
                      <span className="rounded-full bg-brand-pale px-2 py-0.5 text-[11px] font-bold text-[#B34100]">{a.missing_count} to do</span>
                    ) : a.ready_to_send ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-[#0B7A52]">Ready</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-[#6B645D]">
        {rows.length} application{rows.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
