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
  const [project, clients] = await Promise.all([getProject(id), listActiveClients()]);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Edit</span>
        <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">{project.name}</h2>
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
