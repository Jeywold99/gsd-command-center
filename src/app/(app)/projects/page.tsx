import Link from "next/link";
import { Plus, FolderKanban, Archive, ArrowLeft, Building2 } from "lucide-react";
import { listProjects, listClientsWithProjects } from "@/lib/projects";
import ProjectCard from "./_components/project-card";
import ClientDirectory from "./_components/client-directory";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showInactive = show === "archived";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        {showInactive ? (
          <Link
            href="/projects"
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#B34100] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to clients
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
          className="min-h-11 inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-ink font-bold text-sm px-4 py-2.5 rounded-[14px] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {showInactive ? <ArchivedView /> : <Directory />}
    </div>
  );
}

// ── Default landing view: pick a client, see just their projects ──────────
async function Directory() {
  const clients = await listClientsWithProjects();

  if (clients.length === 0) {
    return (
      <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
          <FolderKanban className="w-6 h-6" />
        </div>
        <p className="text-black/50">No projects yet. Create your first project.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-black/45 mb-4">
        Pick a client to see just their projects.
      </p>
      <ClientDirectory clients={clients} />
    </div>
  );
}

// ── "Archived & churned" — a flat cross-client list; low-traffic maintenance
// view, so unlike the default landing page it stays a single flat list rather
// than its own per-client drill-down. ──────────────────────────────────────
async function ArchivedView() {
  const projects = await listProjects(true);

  type ProjectRow = Awaited<ReturnType<typeof listProjects>>[number];
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
      <h2 className="text-[17px] font-bold text-ink">Archived &amp; churned projects</h2>

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-6 h-6" />
          </div>
          <p className="text-black/50">No archived or churned projects.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.id ?? "__internal__"} className="space-y-3">
            <div className="flex items-center gap-2">
              {g.id ? (
                <Link href={`/crm/${g.id}`} className="flex items-center gap-2 group/client">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color ?? "#cbd5e1" }} />
                  <h3 className="text-[17px] font-bold text-ink group-hover/client:text-brand transition-colors">
                    {g.name}
                  </h3>
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-black/40">
                  <Building2 className="w-4 h-4" />
                  <h3 className="text-[17px] font-bold">{g.name}</h3>
                </div>
              )}
              <span className="text-xs font-semibold text-black/35">
                {g.projects.length} project{g.projects.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {g.projects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
