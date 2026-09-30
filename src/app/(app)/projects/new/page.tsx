import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { listActiveClients } from "@/lib/projects";
import { createProject } from "../actions";
import ProjectForm from "../_components/project-form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  await requireRole("OWNER", "MANAGER");
  const { client } = await searchParams;
  const clients = await listActiveClients();
  // Pre-select only if it's a real, currently-selectable client.
  const preselect = client && clients.some((c) => c.id === client) ? client : undefined;
  const backHref = preselect ? `/projects/client/${preselect}` : "/projects";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#B34100] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
          New Project
        </span>
        <h2 className="mt-1 font-display text-[44px] leading-[0.95] tracking-[0.01em] text-ink lg:text-[56px]">Create a Project</h2>
      </div>
      <ProjectForm
        action={createProject}
        mode="create"
        clients={clients}
        defaults={preselect ? { clientId: preselect } : undefined}
        cancelHref={backHref}
      />
    </div>
  );
}
