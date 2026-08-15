import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { listActiveClients } from "@/lib/projects";
import { createProject } from "../actions";
import ProjectForm from "../_components/project-form";

export default async function NewProjectPage() {
  await requireRole("OWNER", "MANAGER");
  const clients = await listActiveClients();

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
          New Project
        </span>
        <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">Create a Project</h2>
      </div>
      <ProjectForm action={createProject} mode="create" clients={clients} />
    </div>
  );
}
