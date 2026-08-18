import Link from "next/link";
import {
  Building2,
  TrendingUp,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDashboardData } from "@/lib/dashboard";
import { getThisWeekIncome } from "@/lib/income";
import { fmtDate, initials } from "./projects/_components/task-badges";
import WorldClocks from "./_components/world-clocks";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const FREQ_LABEL: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
};

const payDateFmt = (d: Date | string) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

function StatTile({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  icon: typeof Building2;
  accent?: "brand" | "danger";
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-black/[0.07] p-5 hover:border-brand/40 hover:shadow-sm transition group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
          {label}
        </span>
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            accent === "danger" ? "bg-red-50 text-red-500" : "bg-brand-pale text-brand"
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="mt-2 font-display text-5xl tracking-wide text-ink leading-none">{value}</p>
    </Link>
  );
}

function progress(tasks: { status: string }[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function isOverdue(d: Date | null) {
  return d ? new Date(d).getTime() < Date.now() : false;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [d, income] = await Promise.all([
    getDashboardData(user?.id ?? ""),
    getThisWeekIncome(),
  ]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
          Overview
        </span>
        <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">
          Welcome back, {user?.name ?? "there"}.
        </h2>
        <p className="mt-1 text-black/50">Here&apos;s what&apos;s moving today — your move.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Active Clients" value={d.activeClients} href="/crm" icon={Building2} />
        <StatTile label="Open Leads" value={d.leads} href="/crm?tab=leads" icon={TrendingUp} />
        <StatTile label="Active Projects" value={d.activeProjects} href="/projects" icon={FolderKanban} />
        <StatTile
          label="Overdue Tasks"
          value={d.overdueTasks}
          href="/tasks?filter=all"
          icon={AlertTriangle}
          accent={d.overdueTasks > 0 ? "danger" : "brand"}
        />
      </div>

      {/* Weekly income + client clocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-2xl border border-black/[0.07] p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-2xl tracking-wide text-ink">
              This Week&apos;s Income
            </h3>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">
                Landing this week
              </p>
              <p className="font-display text-3xl tracking-wide text-brand leading-none">
                {money(income.total)}
              </p>
            </div>
          </div>
          <p className="text-xs text-black/40 mb-4">
            {payDateFmt(income.weekStart)} – {payDateFmt(income.weekEnd)}
          </p>
          {income.rows.length === 0 ? (
            <p className="text-sm text-black/40">
              No client payments scheduled this week.
            </p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {income.rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: r.colorHex ?? "#cbd5e1" }}
                  />
                  <Link
                    href={`/crm/${r.id}`}
                    className="flex-1 min-w-0 hover:text-brand"
                  >
                    <span className="text-sm font-semibold text-ink block truncate">
                      {r.companyName}
                    </span>
                    <span className="text-xs text-black/40">
                      {payDateFmt(r.when)} · {FREQ_LABEL[r.frequency ?? ""] ?? "—"}
                      {r.prorated && (
                        <span className="ml-1 text-amber-600 font-semibold">· prorated</span>
                      )}
                    </span>
                  </Link>
                  <span className="text-sm font-bold text-ink tabular-nums shrink-0">
                    {money(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
          <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Client Clocks</h3>
          <WorldClocks />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: my tasks + projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* My open tasks */}
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl tracking-wide text-ink">My Day</h3>
              <Link href="/tasks" className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">
                All tasks
              </Link>
            </div>
            {d.myOpenTasks.length === 0 ? (
              <p className="text-sm text-black/40 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Nothing assigned to you. Inbox zero.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {d.myOpenTasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={t.project ? `/projects/${t.project.id}/tasks/${t.id}` : "/tasks"}
                      className="flex items-center gap-3 py-2.5 hover:bg-cream/60 -mx-2 px-2 rounded-lg transition"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-ink block truncate">{t.title}</span>
                        {t.project && (
                          <span className="text-xs text-black/40">
                            {t.project.client?.companyName ?? "Internal"} · {t.project.name}
                          </span>
                        )}
                      </span>
                      {t.dueDate && (
                        <span
                          className={`text-xs font-semibold shrink-0 ${
                            isOverdue(t.dueDate) ? "text-red-600" : "text-black/45"
                          }`}
                        >
                          {fmtDate(t.dueDate)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Active projects */}
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl tracking-wide text-ink">Active Projects</h3>
              <Link href="/projects" className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">
                View all
              </Link>
            </div>
            {d.activeProjectList.length === 0 ? (
              <p className="text-sm text-black/40">No active projects.</p>
            ) : (
              <ul className="space-y-4">
                {d.activeProjectList.map((p) => {
                  const pr = progress(p.tasks);
                  return (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="block group">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="text-sm font-semibold text-ink group-hover:text-brand truncate flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: p.client?.colorHex ?? "#cbd5e1" }}
                            />
                            {p.name}
                          </span>
                          <span className="text-xs text-black/40 shrink-0">
                            {pr.done}/{pr.total}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-cream overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${pr.pct}%` }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right: health + activity */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Client Health</h3>
            {d.atRiskClients.length === 0 ? (
              <p className="text-sm text-black/40 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                All clients healthy.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {d.atRiskClients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/crm/${c.id}`} className="flex items-center gap-2.5 text-sm hover:text-brand">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          c.health === "RED" ? "bg-red-500" : "bg-amber-400"
                        }`}
                      />
                      <span className="text-ink truncate">{c.companyName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Recent Activity</h3>
            {d.recentNotes.length === 0 ? (
              <p className="text-sm text-black/40">No recent activity.</p>
            ) : (
              <ul className="space-y-4">
                {d.recentNotes.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-cream text-ink/60 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {initials(n.author.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-ink line-clamp-2">{n.body}</p>
                      <Link
                        href={`/crm/${n.client.id}`}
                        className="text-[11px] text-black/40 hover:text-brand inline-flex items-center gap-1"
                      >
                        {n.client.companyName} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
