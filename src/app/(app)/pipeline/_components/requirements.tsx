"use client";

import { startTransition, useActionState, useOptimistic, useState } from "react";
import { Check, ExternalLink, Plus } from "lucide-react";
import { addRequirement, setRequirementStatus } from "../actions";
import {
  REQUIREMENT_LABEL,
  REQUIREMENT_STATUSES,
  REQUIREMENT_STATUS_LABEL,
  REQUIREMENT_TYPES,
  type FormState,
  type RequirementStatus,
} from "@/lib/pipeline/types";
import { FormNote, SubmitButton } from "./form-bits";
import { btnGhost, input, label } from "./styles";

// What the server prepares for each requirement (dates are already formatted).
export type RequirementView = {
  id: string;
  type: string;
  description: string | null;
  link: string | null;
  status: RequirementStatus;
  dueText: string | null;
  dueLate: boolean;
};

function Row({ r }: { r: RequirementView }) {
  const [status, setStatus] = useOptimistic<RequirementStatus, RequirementStatus>(r.status, (_c, next) => next);
  const [error, setError] = useState<string | null>(null);
  const done = status === "done";
  const muted = done || status === "not_applicable";

  function change(next: RequirementStatus) {
    if (next === status) return;
    setError(null);
    startTransition(async () => {
      setStatus(next);
      const res = await setRequirementStatus(r.id, next);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => change(done ? "needed" : "done")}
          aria-label={done ? "Mark as to do" : "Mark as done"}
          aria-pressed={done}
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
            done ? "border-success bg-success text-white" : "border-black/20 bg-white text-transparent hover:border-brand"
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-bold leading-snug ${muted ? "text-ink/45 line-through" : "text-ink"}`}>
            {REQUIREMENT_LABEL[r.type] ?? r.type}
          </p>
          {r.description && (
            <p className={`mt-0.5 whitespace-pre-line text-[13px] leading-snug ${muted ? "text-ink/40" : "text-[#6B645D]"}`}>
              {r.description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {r.dueText && !muted && (
              <span className={`font-semibold ${r.dueLate ? "text-red-700" : "text-[#6B645D]"}`}>Due {r.dueText}</span>
            )}
            {r.link && (
              <a
                href={r.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#B34100] hover:underline"
              >
                <ExternalLink className="h-3 w-3" aria-hidden /> Link
              </a>
            )}
          </div>
        </div>
        <label className="sr-only" htmlFor={`req-${r.id}`}>
          Requirement status
        </label>
        <select
          id={`req-${r.id}`}
          value={status}
          onChange={(e) => change(e.target.value as RequirementStatus)}
          className="min-h-9 shrink-0 rounded-full border border-black/10 bg-white px-3 text-xs font-bold text-ink/80 outline-none focus:border-brand"
        >
          {REQUIREMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REQUIREMENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 pl-11 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}

function AddForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addRequirement, {});
  return (
    <details className="group mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-[#B34100] hover:underline [&::-webkit-details-marker]:hidden">
        <Plus className="h-4 w-4 transition group-open:rotate-45" aria-hidden /> Add a requirement
      </summary>
      <form action={action} className="mt-2 space-y-3 rounded-[16px] bg-cream p-3.5">
        <input type="hidden" name="application_id" value={applicationId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="req-type">
              Kind
            </label>
            <select id="req-type" name="type" defaultValue="loom" className={input}>
              {REQUIREMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REQUIREMENT_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="req-due">
              Due (optional)
            </label>
            <input id="req-due" type="datetime-local" name="due_at" className={input} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="req-desc">
            What exactly
          </label>
          <textarea
            id="req-desc"
            name="description"
            rows={2}
            maxLength={1000}
            placeholder="e.g. Loom under 3 minutes walking through a GHL build"
            className={input}
          />
        </div>
        <FormNote state={state} />
        <SubmitButton className={btnGhost} pendingLabel="Adding…">
          Add requirement
        </SubmitButton>
      </form>
    </details>
  );
}

export default function Requirements({ applicationId, items }: { applicationId: string; items: RequirementView[] }) {
  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-[#6B645D]">Nothing required for this application yet.</p>
      ) : (
        <ul className="divide-y divide-black/[0.06]">
          {items.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </ul>
      )}
      <AddForm applicationId={applicationId} />
    </div>
  );
}
