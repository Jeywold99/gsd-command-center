import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalContext } from "@/lib/portal/dal";
import { listBusinesses, listPortalDocuments, loadClientTasks, tasksForMonth } from "@/lib/portal/data";
import { addMonths, isMonthKey, monthLabel, statusLabel, todayKey, type PStatus } from "@/lib/portal/shared";
import { MonthSwitcher, TaskRow } from "../../_components/ui";

export default async function BusinessPage({ params, searchParams }: PageProps<"/portal/[slug]/b/[id]">) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext(slug);
  const current = todayKey(ctx.client.timezone).slice(0, 7);
  const month = isMonthKey(sp.m as string) ? (sp.m as string) : current;
  const ws = typeof sp.ws === "string" ? sp.ws : null;

  const [businesses, all, docs] = await Promise.all([
    listBusinesses(ctx.client.id),
    loadClientTasks(ctx.client.id),
    listPortalDocuments(ctx.client.id),
  ]);
  const biz = businesses.find((b) => b.id === id);
  if (!biz) notFound();

  const monthTasks = tasksForMonth(all, month, current).filter((t) => t.projectId === biz.id);
  const shown = ws ? monthTasks.filter((t) => t.workstream === ws) : monthTasks;
  const doneCount = monthTasks.filter((t) => t.pstatus === "DONE").length;

  const groups: { name: string; statuses: PStatus[]; fg: string; bg: string }[] = [
    { name: statusLabel("NEEDS_CLIENT", ctx.firstName), statuses: ["NEEDS_CLIENT"], fg: "#9A3412", bg: "#FFF7ED" },
    { name: "In progress / Waiting on", statuses: ["IN_PROGRESS", "WAITING"], fg: "#1D4ED8", bg: "#EFF6FF" },
    { name: "Planned", statuses: ["PLANNED"], fg: "#374151", bg: "#F9FAFB" },
    { name: "Done this month", statuses: ["DONE"], fg: "#065F46", bg: "#ECFDF5" },
  ];

  const history = [-2, -1, 0].map((n) => {
    const m = addMonths(month, n);
    const t = tasksForMonth(all, m, current).filter((x) => x.projectId === biz.id);
    return { m, done: t.filter((x) => x.pstatus === "DONE").length, total: t.length };
  });
  const bizDocs = docs.filter((d) => d.projectId === biz.id).slice(0, 6);
  const color = biz.portalColor ?? "#1E40AF";
  const q = (o: { m?: string; ws?: string | null }) => {
    const p = new URLSearchParams();
    p.set("m", o.m ?? month);
    const w = o.ws === undefined ? ws : o.ws;
    if (w) p.set("ws", w);
    return `?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Business tabs */}
      <nav className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[var(--p-line)] -mx-4 px-4 md:mx-0 md:px-0">
        {businesses.map((b) => {
          const on = b.id === biz.id;
          return (
            <Link
              key={b.id}
              href={`/b/${b.id}?m=${month}`}
              className="min-h-11 flex items-center px-4 font-semibold no-underline whitespace-nowrap -mb-px border-b-[3px]"
              style={on ? { color: b.portalColor ?? undefined, borderColor: b.portalColor ?? undefined } : { color: "#4B5563", borderColor: "transparent" }}
            >
              {b.portalShort}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="p-h1" style={{ color }}>
            {biz.name}
          </h1>
          <p className="p-muted mt-1">
            {[biz.portalKind, monthLabel(month), `${doneCount} of ${monthTasks.length} done`, biz.portalNote].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthSwitcher month={month} prev={addMonths(month, -1)} next={addMonths(month, 1)} label={monthLabel(month)} base={`/b/${biz.id}`} />
          <Link href={`/new?b=${biz.id}&m=${month}`} className="p-btn p-btn-primary">
            + New task
          </Link>
        </div>
      </div>

      {biz.workstreams.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link href={`/b/${biz.id}${q({ ws: null })}`} className="p-chip" data-on={!ws}>
            All
          </Link>
          {biz.workstreams.map((w) => (
            <Link key={w} href={`/b/${biz.id}${q({ ws: w })}`} className="p-chip" data-on={ws === w}>
              {w}
            </Link>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <section className="p-card overflow-hidden">
          <div className="hidden md:flex px-[18px] py-2.5 text-[12px] font-semibold p-faint gap-3">
            <span className="w-[112px]">Status</span>
            <span className="flex-1">Task</span>
            <span className="w-24">Owner</span>
            <span className="w-16 text-right">Due</span>
          </div>
          {groups.map((g) => {
            const rows = shown.filter((t) => g.statuses.includes(t.pstatus));
            return (
              <div key={g.name}>
                <div className="flex items-center gap-2.5 px-[18px] py-2.5 border-t border-[var(--p-line)] text-[13px] font-bold" style={{ background: g.bg, color: g.fg }}>
                  {g.name}
                  <span className="opacity-70">{rows.length}</span>
                </div>
                {rows.length === 0 ? (
                  <p className="px-[18px] py-3 text-[13px] p-faint border-t border-[var(--p-line)]">None this month.</p>
                ) : (
                  rows.map((t) => <TaskRow key={t.id} t={t} firstName={ctx.firstName} showWorkstream={!ws} />)
                )}
              </div>
            );
          })}
        </section>

        <aside className="flex flex-col gap-4">
          <section className="p-card p-4 flex flex-col gap-3">
            <h2 className="p-h2">Month by month</h2>
            {history.map((h) => (
              <div key={h.m} className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold">{monthLabel(h.m).split(" ")[0]}</span>
                  <span className="p-muted">{h.total ? `${h.done} of ${h.total} done` : "Quiet"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--p-line)] overflow-hidden">
                  <div className="h-full" style={{ width: `${h.total ? Math.round((100 * h.done) / h.total) : 0}%`, background: color }} />
                </div>
              </div>
            ))}
          </section>

          <section className="p-card p-4 flex flex-col gap-2.5">
            <h2 className="p-h2">{biz.portalShort} in the Vault</h2>
            {bizDocs.length === 0 && <p className="p-muted text-[13px]">No documents yet.</p>}
            {bizDocs.map((d) => (
              <a key={d.id} href={`/files/${d.id}?inline=1`} target="_blank" rel="noreferrer" className="block truncate text-[13px] no-underline hover:underline">
                {d.name}
              </a>
            ))}
            <Link href={`/vault?b=${biz.id}`} className="text-[13px] font-semibold no-underline" style={{ color }}>
              Open Vault →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
