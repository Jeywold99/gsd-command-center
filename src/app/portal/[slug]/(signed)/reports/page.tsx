import Link from "next/link";
import { getPortalContext } from "@/lib/portal/dal";
import { listBusinesses, loadClientTasks, tasksForMonth } from "@/lib/portal/data";
import { addMonths, fmtShort, isMonthKey, monthLabel, todayKey } from "@/lib/portal/shared";
import { BizTag, Dot, MonthSwitcher, StatusPill } from "../_components/ui";

// The month-end report, built from the task list (nothing to write by hand):
// done by business with outcomes, what carries over, and next month's plan.
export default async function ReportsPage({ params, searchParams }: PageProps<"/portal/[slug]/reports">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext(slug);
  const current = todayKey(ctx.client.timezone).slice(0, 7);
  const month = isMonthKey(sp.m as string) ? (sp.m as string) : current;
  const next = addMonths(month, 1);

  const [businesses, all] = await Promise.all([listBusinesses(ctx.client.id), loadClientTasks(ctx.client.id)]);
  const tasks = tasksForMonth(all, month, month);
  const done = tasks.filter((t) => t.pstatus === "DONE");
  const open = tasks.filter((t) => t.pstatus !== "DONE");
  const upcoming = tasksForMonth(all, next, "").filter((t) => t.plannedMonth === next);
  const bizById = new Map(businesses.map((b) => [b.id, b]));
  const inProgressNote = month === current ? " (month in progress)" : "";

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="p-h1">{monthLabel(month)} report</h1>
          <p className="p-muted mt-1">
            {done.length} done · {open.length} carried into {monthLabel(next).split(" ")[0]} · {upcoming.length} planned for next month
            {inProgressNote}
          </p>
        </div>
        <MonthSwitcher month={month} prev={addMonths(month, -1)} next={addMonths(month, 1)} label={monthLabel(month)} base="/reports" />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="p-h2">Done, by business</h2>
        {businesses.map((b) => {
          const rows = done.filter((t) => t.projectId === b.id);
          return (
            <div key={b.id} className="p-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-[18px] py-3 font-bold" style={{ color: b.portalColor ?? undefined }}>
                <Dot color={b.portalColor} /> {b.name}
                <span className="ml-auto text-[13px] p-muted font-semibold">{rows.length ? `${rows.length} done` : "Quiet month"}</span>
              </div>
              {rows.map((t) => (
                <Link key={t.id} href={`/t/${t.id}`} className="p-row">
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{t.title}</span>
                    {t.outcome && <span className="block text-[13px] p-muted">{t.outcome}</span>}
                  </span>
                  <span className="text-[13px] p-faint">{t.completedAt ? t.completedAt.toLocaleDateString("en-US", { timeZone: ctx.client.timezone, month: "short", day: "numeric" }) : ""}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </section>

      <section className="p-card overflow-hidden">
        <h2 className="p-h2 px-[18px] py-3">Carried over</h2>
        {open.length === 0 && <p className="px-[18px] pb-4 p-muted">Nothing carried over.</p>}
        {open.map((t) => {
          const b = t.projectId ? bizById.get(t.projectId) : undefined;
          return (
            <Link key={t.id} href={`/t/${t.id}`} className="p-row">
              <StatusPill status={t.pstatus} firstName={ctx.firstName} wide />
              <span className="flex-1 min-w-0 truncate font-semibold">{t.title}</span>
              <BizTag short={b?.portalShort} color={b?.portalColor} />
            </Link>
          );
        })}
      </section>

      <section className="p-card overflow-hidden">
        <h2 className="p-h2 px-[18px] py-3">Next month: {monthLabel(next)}</h2>
        {upcoming.length === 0 && <p className="px-[18px] pb-4 p-muted">Nothing planned yet.</p>}
        {upcoming.map((t) => {
          const b = t.projectId ? bizById.get(t.projectId) : undefined;
          return (
            <Link key={t.id} href={`/t/${t.id}`} className="p-row">
              <span className="w-16 text-[13px] font-semibold">{fmtShort(t.dueDate)}</span>
              <span className="flex-1 min-w-0 truncate">{t.title}</span>
              <BizTag short={b?.portalShort} color={b?.portalColor} />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
