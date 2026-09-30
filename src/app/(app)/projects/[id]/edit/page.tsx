import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { getProject, listActiveClients } from "@/lib/projects";
import { updateProject } from "../../actions";
import ProjectForm from "../../_components/project-form";

const toDateInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("OWNER", "MANAGER");
  const { id } = await params;
  const [project, activeClients] = await Promise.all([getProject(id), listActiveClients()]);
  if (!project) notFound();

  // listActiveClients excludes churned/lead clients, so a project owned by a
  // churned client would lose its option and get silently un-linked on save.
  // Keep the current client selectable regardless of its status.
  const cur = project.client;
  const clients =
    cur && !activeClients.some((c) => c.id === cur.id)
      ? [...activeClients, { id: cur.id, companyName: cur.companyName }]
      : activeClients;

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${project.id}`}
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#B34100] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Edit</span>
        <h2 className="mt-1 font-display text-[44px] leading-[0.95] tracking-[0.01em] text-ink lg:text-[56px]">{project.name}</h2>
      </div>
      <ProjectForm
        action={updateProject}
        mode="edit"
        clients={clients}
        defaults={{
          id: project.id,
          name: project.name,
          description: project.description ?? "",
          clientId: project.clientId ?? "",
          status: project.status,
          budget: project.budget ? String(project.budget) : "",
          startDate: toDateInput(project.startDate),
          dueDate: toDateInput(project.dueDate),
        }}
      />
    </div>
  );
}
