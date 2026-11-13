import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalContext } from "@/lib/portal/dal";
import { getPortalTask, loadClientTasks, TRASH_DAYS } from "@/lib/portal/data";
import { dateInputValue, fmtDay, fmtDayTz, fmtStamp, manilaForDue, monthKey, monthLabel, todayKey } from "@/lib/portal/shared";
import { taskPath } from "@/lib/task-path";
import { BizTag, StatusPill } from "../../_components/ui";
import { TaskForm } from "../../_components/task-form";
import { taskFormOptions } from "../../_components/form-data";
import { taskQuickAction } from "../../actions";

function repeatOf(r: string | null, interval: number | null | undefined) {
  if (!r) return "";
  if (r === "MONTHLY" && interval === 12) return "YEARLY";
  return r === "WEEKLY" ? "WEEKLY" : r === "MONTHLY" ? "MONTHLY" : "";
}

export default async function TaskPage({ params, searchParams }: PageProps<"/portal/[slug]/t/[id]">) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext(slug);
  const task = await getPortalTask(ctx.client.id, id);
  if (!task) notFound();
  const current = todayKey(ctx.client.timezone).slice(0, 7);
  const asClient = !ctx.isTeam;

  if (sp.edit === "1" && !task.deletedAt) {
    const all = await loadClientTasks(ctx.client.id);
    const opts = await taskFormOptions(ctx.client.id, current, all, task.plannedMonth);
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <h1 className="p-h1">Edit task</h1>
        <TaskForm
          values={{
            id: task.id,
            projectId: task.projectId ?? "",
            title: task.title,
            workstream: task.workstream ?? "",
            month: task.month ? monthKey(task.month) : task.plannedMonth,
            ownerId: task.owner?.id ?? "",
            dueDate: dateInputValue(task.dueDate),
            status: task.pstatus,
            nextAction: task.nextAction ?? "",
            waitingOn: task.waitingOn ?? "",
            chaseDate: dateInputValue(task.chaseDate),
            askType: task.askType ?? "",
            description: task.description ?? "",
            outcome: task.outcome ?? "",
            repeat: repeatOf(task.recurrence, task.recurrenceInterval),
          }}
          businesses={opts.businesses}
          owners={opts.owners}
          months={opts.months}
          firstName={ctx.firstName}
          cancelHref={`/t/${task.id}`}
        />
      </div>
    );
  }

  const p = task.project!;
  const verb = task.askType === "SIGN" ? "Sign" : task.askType === "DECIDE" ? "Decide" : "Approve";
  const askButton = task.askType === "SIGN" ? "Mark signed" : task.askType === "DECIDE" ? "Send decision" : "Approve";
  const fields: [string, string][] = [
    ["Business", p.name],
    ["Workstream", task.workstream ?? "—"],
    ["Owner", task.pstatus === "NEEDS_CLIENT" ? `${task.owner?.name ?? "—"} (prepares) → ${ctx.firstName} (${verb.toLowerCase()}s)` : (task.owner?.name ?? "—")],
    ["Due", task.dueDate ? `${fmtDay(task.dueDate)} · 5:00 PM ET${asClient ? "" : ` (${manilaForDue(task.dueDate)})`}` : "—"],
    ["Month", monthLabel(task.plannedMonth)],
    ["Next action", task.nextAction ?? "—"],
  ];
  if (task.pstatus === "WAITING") fields.push(["Waiting on", `${task.waitingOn} · chase ${fmtDay(task.chaseDate)}`]);
  if (task.recurrence) fields.push(["Repeats", task.recurrence === "WEEKLY" ? "Every week" : task.recurrenceInterval === 12 ? "Every year" : "Every month"]);
  if (task.outcome) fields.push(["Outcome", task.outcome]);
  fields.push(["Visible to", `${ctx.firstName} + EA team`]);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <Link href={`/b/${p.id}?m=${task.viewMonth}`} className="text-[13px] p-muted no-underline hover:underline">
        ← {p.portalShort}
      </Link>

      {task.deletedAt && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[#B91C1C] font-semibold">
            Deleted {fmtDayTz(task.deletedAt, ctx.client.timezone)}. It will be removed for good after {TRASH_DAYS} days.
          </span>
          <form action={taskQuickAction} className="ml-auto">
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="op" value="restore" />
            <button className="p-btn p-btn-sm">Restore</button>
          </form>
        </div>
      )}

      <article className="p-card overflow-hidden">
        <div className="h-1.5" style={{ background: p.portalColor ?? "#374151" }} />
        <div className="p-5 md:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <BizTag short={p.portalShort} color={p.portalColor} />
            <StatusPill status={task.pstatus} firstName={ctx.firstName} />
            {task.pstatus === "NEEDS_CLIENT" && <span className="text-[12px] font-bold text-[#9A3412]">{task.askType ?? "APPROVE"}</span>}
            <span className="text-[13px] p-faint ml-auto">{monthLabel(task.plannedMonth)}</span>
          </div>
          <h1 className="p-h1">{task.title}</h1>

          {task.pstatus === "NEEDS_CLIENT" && !task.deletedAt && (
            <div id="ask" className="scroll-mt-24 rounded-xl bg-[var(--p-needs-bg)] border border-[#FED7AA] p-4 flex flex-col gap-3">
              <div>
                <p className="text-[12px] font-bold text-[#9A3412]">What {asClient ? "you need" : `${ctx.firstName} needs`} to do</p>
                <p className="text-[15px] mt-1">{task.nextAction}</p>
              </div>
              <form action={taskQuickAction} className="flex flex-col sm:flex-row gap-2">
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="op" value="approve" />
                {task.askType === "DECIDE" ? (
                  <textarea name="note" className="p-textarea flex-1 min-h-[42px]" placeholder="Your decision" required />
                ) : (
                  <input name="note" className="p-input flex-1" placeholder="Optional note" />
                )}
                <button className="p-btn p-btn-approve sm:self-start">{askButton}</button>
              </form>
            </div>
          )}

          <dl className="grid sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-[14px]">
            {fields.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="p-label pt-0.5">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {task.description && <p className="whitespace-pre-wrap p-muted border-t border-[var(--p-line)] pt-4">{task.description}</p>}

          {task.documents.length > 0 && (
            <div className="border-t border-[var(--p-line)] pt-4">
              <p className="p-label mb-2">Linked from the Vault</p>
              <ul className="flex flex-col gap-1.5">
                {task.documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/files/${d.id}?inline=1`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold underline">
                      {d.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!task.deletedAt && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--p-line)] pt-4">
              <Link href={`/t/${task.id}?edit=1`} className="p-btn">
                Edit
              </Link>
              {task.pstatus !== "DONE" ? (
                <details className="relative">
                  <summary className="p-btn list-none">Mark done</summary>
                  <form action={taskQuickAction} className="absolute z-10 mt-2 w-[min(90vw,360px)] p-card p-3 shadow-lg flex flex-col gap-2">
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="op" value="done" />
                    <label className="p-label" htmlFor="outcome-note">
                      Outcome (one line, optional)
                    </label>
                    <input id="outcome-note" name="note" className="p-input" placeholder="What came of it" />
                    <button className="p-btn p-btn-approve">Mark done</button>
                  </form>
                </details>
              ) : (
                <form action={taskQuickAction}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="op" value="reopen" />
                  <button className="p-btn">Reopen</button>
                </form>
              )}
              {ctx.isTeam && (
                <a href={`${process.env.GSD_PUBLIC_URL ?? ""}${taskPath(task.id, task.projectId)}`} className="p-btn">
                  Open in GSD
                </a>
              )}
              <details className="relative ml-auto">
                <summary className="p-btn p-btn-danger list-none">Delete</summary>
                <form action={taskQuickAction} className="absolute right-0 z-10 mt-2 w-72 p-card p-3 shadow-lg flex flex-col gap-2">
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="op" value="delete" />
                  <p className="text-[13px]">Move this task to Deleted tasks? You can restore it for {TRASH_DAYS} days.</p>
                  <button className="p-btn p-btn-danger">Delete task</button>
                </form>
              </details>
            </div>
          )}
        </div>
      </article>

      <section id="comment" className="p-card p-5 flex flex-col gap-4">
        <h2 className="p-h2">Activity</h2>
        {!task.deletedAt && (
          <form action={taskQuickAction} className="flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="op" value="comment" />
            <input name="note" className="p-input flex-1" placeholder="Add a comment or question" required />
            <button className="p-btn p-btn-primary">Comment</button>
          </form>
        )}
        <ol className="flex flex-col">
          {task.activities.length === 0 && <li className="p-muted text-[13px]">No activity yet.</li>}
          {task.activities.map((a) => (
            <li key={a.id} className="flex gap-3 py-2.5 border-t border-[var(--p-line)] first:border-t-0">
              <span className="w-32 flex-none text-[12px] p-faint pt-0.5">{fmtStamp(a.createdAt, ctx.client.timezone)}</span>
              <span className="text-[14px]">
                {a.kind === "COMMENT" ? (
                  <>
                    <span className="font-semibold">{a.user?.name.split(" ")[0] ?? "Someone"}:</span> {a.text}
                  </>
                ) : (
                  <span className="p-muted">{a.text}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
