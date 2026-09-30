import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, FolderKanban, Building2, ExternalLink } from "lucide-react";
import { listProjectsForClient, getClientLite } from "@/lib/projects";
import ProjectCard from "../../_components/project-card";
import ClientClock from "../../../crm/_components/client-clock";

export default async function ClientProjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isInternal = id === "internal";

  const [client, projects] = await Promise.all([
    isInternal ? Promise.resolve(null) : getClientLite(id),
    listProjectsForClient(isInternal ? null : id),
  ]);

  // A real (non-internal) id that doesn't resolve to an active client — wrong
  // id, or the client has since churned (churned = hidden, same as elsewhere).
  if (!isInternal && !client) notFound();

  const newProjectHref = isInternal ? "/projects/new" : `/projects/new?client=${id}`;

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#B34100] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        All clients
      </Link>

      {/* Header */}
      <div className="bg-white rounded-[22px] border border-black/[0.07] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {client ? (
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: client.colorHex ?? "#cbd5e1" }} />
              ) : (
                <Building2 className="w-6 h-6 text-black/35" />
              )}
              <h2 className="font-display text-[44px] leading-[0.95] tracking-[0.01em] text-ink lg:text-[56px]">
                {client ? client.companyName : "Internal Projects"}
              </h2>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-black/55">
              <span>
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </span>
              {client?.timezone && (
                <>
                  <span className="text-black/25">·</span>
                  <ClientClock timezone={client.timezone} />
                </>
              )}
            </div>
          </div>

          {client && (
            <Link
              href={`/crm/${client.id}`}
              className="inline-flex items-center gap-1.5 border border-black/10 text-ink/70 hover:text-ink hover:bg-cream text-sm font-semibold px-3.5 py-2 rounded-full transition"
            >
              View in CRM
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Link
          href={newProjectHref}
          className="min-h-11 inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-ink font-bold text-sm px-4 py-2.5 rounded-[14px] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project{client ? ` for ${client.companyName}` : ""}
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-6 h-6" />
          </div>
          <p className="text-black/50">
            No projects yet{client ? ` for ${client.companyName}` : ""}. Create the first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
