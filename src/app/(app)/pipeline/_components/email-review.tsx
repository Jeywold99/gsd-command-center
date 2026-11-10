"use client";

import { useActionState } from "react";
import { MailQuestion } from "lucide-react";
import { dismissEmail, resolveEmail } from "../actions";
import type { FormState } from "@/lib/pipeline/types";
import { FormNote, SubmitButton } from "./form-bits";
import { btnGhost, btnPrimary, input } from "./styles";

export type EmailView = {
  id: string;
  from: string | null;
  subject: string | null;
  snippet: string | null;
  receivedText: string;
  reason: string; // already worded for a person
  category: string | null;
  summary: string | null;
  suggestedId: string | null; // application the company name points to, when exactly one does
};

export type ApplicationChoice = { id: string; label: string };

function Item({ email, choices }: { email: EmailView; choices: ApplicationChoice[] }) {
  const [resolveState, resolveAction] = useActionState<FormState, FormData>(resolveEmail, {});
  const [dismissState, dismissAction] = useActionState<FormState, FormData>(dismissEmail, {});
  return (
    <li className="rounded-[18px] border border-black/[0.07] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-brand-pale text-[#B34100]">
          <MailQuestion className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-bold leading-snug text-ink">{email.subject || "(no subject)"}</p>
          <p className="mt-0.5 break-all text-[13px] text-[#6B645D]">
            {email.from ?? "unknown sender"} · {email.receivedText}
          </p>
          {email.summary && <p className="mt-2 text-sm leading-snug text-ink/80">{email.summary}</p>}
          {!email.summary && email.snippet && <p className="mt-2 line-clamp-3 text-sm leading-snug text-ink/70">{email.snippet}</p>}
          <p className="mt-2 text-xs font-semibold text-[#B34100]">
            {email.reason}
            {email.category ? ` · looks like: ${email.category.replace(/_/g, " ")}` : ""}
          </p>
        </div>
      </div>

      <form action={resolveAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="unmatched_id" value={email.id} />
        <label className="sr-only" htmlFor={`pick-${email.id}`}>
          Which application is this email about
        </label>
        <select id={`pick-${email.id}`} name="application_id" defaultValue={email.suggestedId ?? ""} required className={`${input} sm:flex-1`}>
          <option value="" disabled>
            Which application is it about?
          </option>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <SubmitButton className={btnPrimary} pendingLabel="Logging…">
          Log it
        </SubmitButton>
      </form>
      <FormNote state={resolveState} />

      <form action={dismissAction} className="mt-1">
        <input type="hidden" name="unmatched_id" value={email.id} />
        <SubmitButton className={`${btnGhost} !min-h-10 !px-4`} pendingLabel="Dismissing…">
          Not a job email
        </SubmitButton>
        <FormNote state={dismissState} />
      </form>
    </li>
  );
}

export default function EmailReview({ emails, choices }: { emails: EmailView[]; choices: ApplicationChoice[] }) {
  return (
    <ul className="space-y-3">
      {emails.map((e) => (
        <Item key={e.id} email={e} choices={choices} />
      ))}
    </ul>
  );
}
