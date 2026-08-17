import Link from "next/link";
import { COLUMNS, PRIORITY, initials, fmtDate } from "../../projects/_components/task-badges";

type Row = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  project: { id: string; name: string; client: { companyName: string } | null } | null;
  assignees: { user: { id: string; name: string } }[];
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.status, c.label]),
);

const th = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/45 whitespace-nowrap";
const td = "px-4 py-3 align-top";

export default function TaskTable({ tasks }: { tasks: Row[] }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.07]">
              <th className={th}>Task</th>
              <th className={th}>Client</th>
              <th className={th}>Project</th>
              <th className={th}>Description</th>
              <th className={th}>Status</th>
              <th className={th}>Priority</th>
              <th className={th}>Assignees</th>
              <th className={th}>Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {tasks.map((t) => {
              const href = t.project ? `/projects/${t.project.id}/tasks/${t.id}?from=tasks` : null;
              const p = PRIORITY[t.priority] ?? PRIORITY.MEDIUM;
              return (
                <tr key={t.id} className="hover:bg-black/[0.02] transition-colors">
                  <td className={`${td} max-w-[16rem]`}>
                    {href ? (
                      <Link href={href} className="font-semibold text-ink hover:text-brand line-clamp-2">
                        {t.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink line-clamp-2">{t.title}</span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink/70`}>
                    {t.project?.client?.companyName ?? "—"}
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink/70`}>
                    {t.project?.name ?? "Inbox"}
                  </td>
                  <td className={`${td} max-w-[22rem] text-ink/55`}>
                    <span className="line-clamp-2">{t.description || "—"}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink/60">
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                      {p.label}
                    </span>
                  </td>
                  <td className={td}>
                    {t.assignees.length === 0 ? (
                      <span className="text-ink/30 text-xs">—</span>
                    ) : (
                      <div className="flex -space-x-1.5">
                        {t.assignees.slice(0, 4).map((a) => (
                          <span
                            key={a.user.id}
                            title={a.user.name}
                            className="w-6 h-6 rounded-full bg-midnight text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                          >
                            {initials(a.user.name)}
                          </span>
                        ))}
                        {t.assignees.length > 4 && (
                          <span className="w-6 h-6 rounded-full bg-black/10 text-ink/60 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                            +{t.assignees.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink/60`}>
                    {t.dueDate ? fmtDate(t.dueDate) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
