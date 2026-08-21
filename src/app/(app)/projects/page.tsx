import Link from "next/link";
import { Plus, FolderKanban, ListChecks, Archive, ArrowLeft, Building2 } from "lucide-react";
import { listProjects } from "@/lib/projects";
import { ProjectStatusBadge, fmtDate } from "./_components/task-badges";

type ProjectRow = Awaited<ReturnType<typeof listProjects>>[number];

function ProjectCard({ p }: { p: ProjectRow }) {
  const churned = p.client?.status === "CHURNED";
  return (
    <Link
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
}

function ClientGroup({
  clientId,
  companyName,
  colorHex,
  projects,
}: {
  clientId: string | null;
  companyName: string;
  colorHex: string | null;
  projects: ProjectRow[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {clientId ? (
          <Link
            href={`/crm/${clientId}`}
            className="flex items-center gap-2 group/client"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: colorHex ?? "#cbd5e1" }}
            />
            <h2 className="font-display text-2xl tracking-wide text-ink group-hover/client:text-brand transition-colors">
              {companyName}
            </h2>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-black/40">
            <Building2 className="w-4 h-4" />
            <h2 className="font-display text-2xl tracking-wide">{companyName}</h2>
          </div>
        )}
        <span className="text-xs font-semibold text-black/35">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showInactive = show === "archived";
  const projects = await listProjects(showInactive);

  // Group by client — the data model's real hierarchy (Client > Project > Task)
  // — sorted alphabetically, with un-cliented "Internal" projects trailing last.
  const byClient = new Map<string, { id: string | null; name: string; color: string | null; projects: ProjectRow[] }>();
  for (const p of projects) {
    const key = p.client?.id ?? "__internal__";
    const name = p.client?.companyName ?? "Internal Projects";
    if (!byClient.has(key)) {
      byClient.set(key, { id: p.client?.id ?? null, name, color: p.client?.colorHex ?? null, projects: [] });
    }
    byClient.get(key)!.projects.push(p);
  }
  const groups = [...byClient.values()].sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
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
        groups.map((g) => (
          <ClientGroup
            key={g.id ?? "__internal__"}
            clientId={g.id}
            companyName={g.name}
            colorHex={g.color}
            projects={g.projects}
          />
        ))
      )}
    </div>
  );
}
