import Link from "next/link";
import { Plus, FolderKanban, ListChecks, Archive, ArrowLeft } from "lucide-react";
import { listProjects } from "@/lib/projects";
import { ProjectStatusBadge, fmtDate } from "./_components/task-badges";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showInactive = show === "archived";
  const projects = await listProjects(showInactive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        {showInactive ? (
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to active projects
          </Link>
        ) : (
          <Link
            href="/projects?show=archived"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/40 hover:text-ink"
          >
            <Archive className="w-3.5 h-3.5" />
            Archived &amp; churned
          </Link>
        )}
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {showInactive && (
        <h2 className="font-display text-2xl tracking-wide text-ink">
          Archived &amp; churned projects
        </h2>
      )}

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-6 h-6" />
          </div>
          <p className="text-black/50">
            {showInactive
              ? "No archived or churned projects."
              : "No projects yet. Create your first project."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p) => {
            const churned = p.client?.status === "CHURNED";
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-white rounded-2xl border border-black/[0.07] p-5 hover:border-brand/40 hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-ink leading-snug group-hover:text-brand transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ProjectStatusBadge status={p.status} />
                    {churned && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-black/50 bg-black/5 border border-black/15 rounded px-1.5 py-0.5">
                        Churned
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm text-black/50">
                  {p.client ? (
                    <>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: p.client.colorHex ?? "#cbd5e1" }}
                      />
                      {p.client.companyName}
                    </>
                  ) : (
                    <span className="text-black/40">Internal</span>
                  )}
                </div>

                {p.description && (
                  <p className="mt-3 text-sm text-black/45 line-clamp-2">{p.description}</p>
                )}

                <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center gap-4 text-xs text-black/45">
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" />
                    {p._count.tasks} tasks
                  </span>
                  {p.budget && <span>${String(p.budget)}</span>}
                  {p.dueDate && <span className="ml-auto">Due {fmtDate(p.dueDate)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
