"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTask, type TaskFormState } from "../actions";
import { STATUS_META, statusLabel, type PStatus } from "@/lib/portal/shared";

type Biz = { id: string; name: string; workstreams: string[] };
type Owner = { id: string; name: string };
export type TaskFormValues = {
  id?: string;
  projectId: string;
  title: string;
  workstream: string;
  month: string;
  ownerId: string;
  dueDate: string;
  status: PStatus;
  nextAction: string;
  waitingOn: string;
  chaseDate: string;
  askType: string;
  description: string;
  outcome: string;
  repeat: string;
};

const STATUSES: PStatus[] = ["PLANNED", "IN_PROGRESS", "WAITING", "NEEDS_CLIENT", "DONE"];

export function TaskForm({
  values,
  businesses,
  owners,
  months,
  firstName,
  cancelHref,
  defaultOwners = {},
}: {
  values: TaskFormValues;
  businesses: Biz[];
  owners: Owner[];
  months: { key: string; label: string }[];
  firstName: string;
  cancelHref: string;
  // Who usually owns work for each business (pre-selected on new tasks).
  defaultOwners?: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<TaskFormState, FormData>(saveTask, undefined);
  const [projectId, setProjectId] = useState(values.projectId);
  const [status, setStatus] = useState<PStatus>(values.status);
  const biz = businesses.find((b) => b.id === projectId);

  return (
    <form action={action} className="p-card p-5 md:p-6 flex flex-col gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Business">
          <select name="projectId" className="p-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
            <option value="">Choose…</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Workstream (optional)">
          <select name="workstream" className="p-select" defaultValue={values.workstream} key={projectId}>
            <option value="">—</option>
            {(biz?.workstreams ?? []).map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Title">
        <input name="title" className="p-input" defaultValue={values.title} required maxLength={200} placeholder="Approve 2027 conference shortlist" />
      </Field>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Month">
          <select name="month" className="p-select" defaultValue={values.month} required>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select
            name="ownerId"
            className="p-select"
            key={`owner-${projectId}`}
            defaultValue={values.ownerId || defaultOwners[projectId] || ""}
            required
          >
            <option value="">Choose…</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due (5:00 PM ET)">
          <input type="date" name="dueDate" className="p-input" defaultValue={values.dueDate} required />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="p-label mb-1.5">Status</legend>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const m = STATUS_META[s];
            const on = status === s;
            return (
              <label
                key={s}
                className="cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-bold border-2"
                style={on ? { background: m.bg, color: m.fg, borderColor: m.fg } : { background: "#fff", color: "#4B5563", borderColor: "#E5E7EB" }}
              >
                <input type="radio" name="status" value={s} checked={on} onChange={() => setStatus(s)} className="sr-only" />
                {statusLabel(s, firstName)}
              </label>
            );
          })}
        </div>
        <p className="text-[12px] p-faint">{STATUS_META[status].rule.replace("your", `${firstName}'s`)}</p>
      </fieldset>

      {status === "WAITING" && (
        <div className="grid sm:grid-cols-2 gap-4 rounded-xl p-4 bg-[#FFFBEB]">
          <Field label="Waiting on (who)">
            <input name="waitingOn" className="p-input" defaultValue={values.waitingOn} placeholder="Greg Kozera" required />
          </Field>
          <Field label="Chase date">
            <input type="date" name="chaseDate" className="p-input" defaultValue={values.chaseDate} required />
          </Field>
        </div>
      )}

      {status === "NEEDS_CLIENT" && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="p-label mb-1.5">What {firstName} needs to do</legend>
          <div className="flex gap-2 flex-wrap">
            {["APPROVE", "DECIDE", "SIGN"].map((a) => (
              <label key={a} className="flex items-center gap-2 p-chip cursor-pointer">
                <input type="radio" name="askType" value={a} defaultChecked={(values.askType || "APPROVE") === a} />
                {a[0] + a.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {status !== "DONE" ? (
        <Field label={status === "NEEDS_CLIENT" ? `The one-line ask for ${firstName}` : "Next action (one line)"}>
          <input
            name="nextAction"
            className="p-input"
            defaultValue={values.nextAction}
            required
            maxLength={240}
            placeholder={status === "NEEDS_CLIENT" ? "Pick your top 5 from the 12 researched events" : "Send the agenda to the venue"}
          />
        </Field>
      ) : (
        <>
          <input type="hidden" name="nextAction" value={values.nextAction} />
          <Field label="Outcome (one line, goes in the month-end report)">
            <input name="outcome" className="p-input" defaultValue={values.outcome} maxLength={240} placeholder="Posted; conversational tone, no em dashes" />
          </Field>
        </>
      )}
      {status !== "DONE" && <input type="hidden" name="outcome" value={values.outcome} />}

      <Field label="Details (optional)">
        <textarea name="description" className="p-textarea" defaultValue={values.description} placeholder="Anything that helps whoever picks this up." />
      </Field>

      <Field label="Repeats">
        <select name="repeat" className="p-select sm:max-w-xs" defaultValue={values.repeat}>
          <option value="">Does not repeat</option>
          <option value="WEEKLY">Every week</option>
          <option value="MONTHLY">Every month</option>
          <option value="YEARLY">Every year</option>
        </select>
      </Field>

      {state?.error && (
        <p className="p-error rounded-lg bg-[#FEF2F2] px-3 py-2" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <Link href={cancelHref} className="p-btn">
          Cancel
        </Link>
        <button className="p-btn p-btn-primary" disabled={pending}>
          {pending ? "Saving…" : values.id ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="p-label">{label}</span>
      {children}
    </label>
  );
}
