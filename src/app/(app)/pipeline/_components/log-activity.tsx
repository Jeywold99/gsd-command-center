"use client";

import { useActionState } from "react";
import { logActivity } from "../actions";
import { ACTIVITY_TYPES, type FormState } from "@/lib/pipeline/types";
import { FormNote, SubmitButton } from "./form-bits";
import { btnPrimary, input, label } from "./styles";

// "Something happened" form: a note, a follow-up you sent, a reply you got, an interview you booked.
export default function LogActivity({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState<FormState, FormData>(logActivity, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="application_id" value={applicationId} />
      <div>
        <label className={label} htmlFor="act-type">
          What happened
        </label>
        <select id="act-type" name="type" defaultValue="note" className={input}>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="act-summary">
          Details
        </label>
        <textarea
          id="act-summary"
          name="summary"
          rows={3}
          maxLength={500}
          placeholder="e.g. Nudged Maria on LinkedIn, she said the team decides Friday"
          className={input}
        />
      </div>
      <FormNote state={state} />
      <SubmitButton className={btnPrimary} pendingLabel="Saving…">
        Add to history
      </SubmitButton>
      <p className="text-xs text-[#6B645D]">
        Sent a follow-up or got a reply? Logging it restarts the &quot;no news&quot; clock for this application.
      </p>
    </form>
  );
}
