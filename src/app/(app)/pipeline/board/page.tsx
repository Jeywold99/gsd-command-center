import { requirePipelineAccess } from "@/lib/pipeline/access";
import { fmtDay, fmtDayTime } from "@/lib/pipeline/format";
import { listApplications } from "@/lib/pipeline/queries";
import Board, { type BoardApp } from "../_components/board";
import FilterChips from "../_components/filter-chips";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const viewer = await requirePipelineAccess();
  const { person } = await searchParams;
  const all = await listApplications();

  const names = [...new Set([viewer.person, ...all.map((a) => a.person_name)])];
  const filter = (person ?? "").toLowerCase();
  const apps = filter && filter !== "all" ? all.filter((a) => a.person_name.toLowerCase() === filter) : all;

  const cards: BoardApp[] = apps.map((a) => ({
    id: a.id,
    company: a.company,
    role: a.role,
    status: a.status,
    person: a.person_name,
    rate: a.rate_offered && a.rate_offered.length <= 28 ? a.rate_offered : null,
    missing: a.missing_count,
    ready: a.ready_to_send,
    daysQuiet: a.days_since_last_contact,
    nextAction: a.next_action,
    nextWhen: a.next_action_at ? fmtDayTime(a.next_action_at) : null,
    deadline: a.deadline ? fmtDay(a.deadline) : null,
  }));

  const chips = [
    { label: "Everyone", href: "/pipeline/board", active: !filter || filter === "all" },
    ...names.map((n) => ({
      label: n === viewer.person ? `${n} (you)` : n,
      href: `/pipeline/board?person=${encodeURIComponent(n.toLowerCase())}`,
      active: filter === n.toLowerCase(),
    })),
  ];

  return (
    <div className="space-y-4">
      <FilterChips chips={chips} label="Whose applications" />
      {cards.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-black/15 bg-white p-8 text-center text-sm text-[#6B645D]">
          No applications yet. Add one with the job-post form and it will show up here.
        </p>
      ) : (
        <Board apps={cards} />
      )}
    </div>
  );
}
