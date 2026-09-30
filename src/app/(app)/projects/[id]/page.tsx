import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { getProject } from "@/lib/projects";
import { ProjectStatusBadge, fmtDate } from "../_components/task-badges";
import KanbanBoard from "../_components/kanban-board";
import Timeline from "../_components/timeline";
import MilestoneRow from "../_components/milestone-row";
import AddModal from "../../_components/add-modal";
import { createMilestone } from "../actions";

const mInput =
  "w-full bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const isTimeline = view === "timeline";
  const project = await getProject(id);
  if (!project) notFound();

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-bold transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/client/${project.client?.id ?? "internal"}`}
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#B34100] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {project.client ? project.client.companyName : "Internal Projects"}
      </Link>

      {/* Header */}
      <div className="bg-white rounded-[22px] border border-black/[0.07] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-[44px] leading-[0.95] tracking-[0.01em] text-ink lg:text-[56px]">
                {project.name}
              </h2>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-black/55">
              {project.client ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: project.client.colorHex ?? "#cbd5e1" }}
                  />
                  {project.client.companyName}
                </span>
              ) : (
                <span className="text-black/40">Internal project</span>
              )}
              {project.budget && <span>· Budget ${String(project.budget)}</span>}
              {project.startDate && <span>· Start {fmtDate(project.startDate)}</span>}
              {project.dueDate && <span>· Due {fmtDate(project.dueDate)}</span>}
            </div>
            {project.description && (
              <p className="mt-3 text-sm text-black/50 max-w-2xl">{project.description}</p>
            )}
          </div>

          <Link
            href={`/projects/${project.id}/edit`}
            className="inline-flex items-center gap-1.5 border border-black/10 text-ink/70 hover:text-ink hover:bg-cream text-sm font-semibold px-3.5 py-2 rounded-full transition"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Phases / Milestones */}
      <section className="bg-white rounded-[22px] border border-black/[0.07] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold text-ink">Phases</h3>
          <AddModal
            title="Add Phase"
            triggerClassName="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#B34100]"
            trigger={
              <>
                <Plus className="w-3.5 h-3.5" /> Add phase
              </>
            }
          >
            <form action={createMilestone} className="space-y-3">
              <input type="hidden" name="projectId" value={project.id} />
              <input name="name" required autoFocus placeholder="Phase name *" className={mInput} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" name="startDate" className={mInput} title="Start" />
                <input type="date" name="dueDate" className={mInput} title="Due" />
              </div>
              <textarea
                name="description"
                rows={3}
                placeholder="What this phase covers… (optional)"
                className={mInput}
              />
              <button
                type="submit"
                className="min-h-11 w-full bg-brand hover:bg-brand-hover text-ink text-sm font-bold py-2.5 rounded-[14px] transition-colors"
              >
                Add Phase
              </button>
            </form>
          </AddModal>
        </div>

        {project.milestones.length === 0 ? (
          <p className="text-sm text-black/40">No phases yet. Add one to structure the project.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {project.milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} projectId={project.id} />
            ))}
          </ul>
        )}
      </section>

      {/* View toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-cream border border-black/10 p-1">
          <Link href={`/projects/${project.id}`} className={tabCls(!isTimeline)}>
            Board
          </Link>
          <Link href={`/projects/${project.id}?view=timeline`} className={tabCls(isTimeline)}>
            Timeline
          </Link>
        </div>
        {!isTimeline && (
          <span className="text-xs text-black/40">
            {project.milestones.length > 0
              ? "Drag cards between columns or phases · click to open"
              : "Drag cards between columns · click to open"}
          </span>
        )}
      </div>

      {isTimeline ? (
        <Timeline
          milestones={project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            startDate: m.startDate,
            dueDate: m.dueDate,
            status: m.status,
          }))}
          tasks={project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            startDate: t.startDate,
            dueDate: t.dueDate,
            status: t.status,
          }))}
        />
      ) : (
        <KanbanBoard
          projectId={project.id}
          initialTasks={project.tasks}
          phases={project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            status: m.status,
            startDate: m.startDate,
            dueDate: m.dueDate,
          }))}
        />
      )}
    </div>
  );
}
