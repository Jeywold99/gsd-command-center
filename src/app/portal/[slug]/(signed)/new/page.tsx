import { getPortalContext } from "@/lib/portal/dal";
import { loadClientTasks } from "@/lib/portal/data";
import { isMonthKey, todayKey } from "@/lib/portal/shared";
import { TaskForm } from "../_components/task-form";
import { taskFormOptions } from "../_components/form-data";

export default async function NewTaskPage({ params, searchParams }: PageProps<"/portal/[slug]/new">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext(slug);
  const today = todayKey(ctx.client.timezone);
  const current = today.slice(0, 7);
  const month = isMonthKey(sp.m as string) ? (sp.m as string) : current;
  const all = await loadClientTasks(ctx.client.id);
  const opts = await taskFormOptions(ctx.client.id, current, all, month);
  const projectId = typeof sp.b === "string" && opts.businesses.some((b) => b.id === sp.b) ? sp.b : "";

  // Default due date: a week from today, or the 15th for a future month.
  const due = new Date(`${today}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 7);
  const dueDate = month > current ? `${month}-15` : due.toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="p-h1">New task</h1>
        <p className="p-muted mt-1">
          The owner is told straight away. Every task needs a business, month, owner, due date and next action.
        </p>
      </div>
      <TaskForm
        values={{
          projectId,
          title: "",
          workstream: "",
          month,
          ownerId: "",
          dueDate,
          status: "PLANNED",
          nextAction: "",
          waitingOn: "",
          chaseDate: "",
          askType: "",
          description: "",
          outcome: "",
          repeat: "",
        }}
        businesses={opts.businesses}
        owners={opts.owners}
        months={opts.months}
        defaultOwners={opts.defaultOwners}
        firstName={ctx.firstName}
        cancelHref={projectId ? `/b/${projectId}` : "/"}
      />
    </div>
  );
}
