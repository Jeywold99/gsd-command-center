import Link from "next/link";
import { ListChecks } from "lucide-react";
import { ProjectStatusBadge, fmtDate } from "./task-badges";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: unknown;
  dueDate: Date | string | null;
  client: { status: string } | null;
  _count: { tasks: number };
};

export default function ProjectCard({ p }: { p: ProjectRow }) {
  const churned = p.client?.status === "CHURNED";
  return (
    <Link
      href={`/projects/${p.id}`}
      className="bg-white rounded-[22px] border border-black/[0.07] p-5 hover:border-brand/40 hover:shadow-sm transition group"
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
        {p.budget != null && <span>${String(p.budget)}</span>}
        {p.dueDate && <span className="ml-auto">Due {fmtDate(p.dueDate)}</span>}
      </div>
    </Link>
  );
}
