"use client";

import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { saveDetails } from "../actions";
import { APPLIED_AS, APPLIED_AS_LABEL, PLATFORMS, PLATFORM_LABEL, type FormState } from "@/lib/pipeline/types";
import { FormNote, SubmitButton } from "./form-bits";
import { btnPrimary, input, label } from "./styles";

// Values for the form; the three dates arrive already converted to "YYYY-MM-DDTHH:mm" in the team's time zone.
export type DetailsValues = {
  id: string;
  company: string;
  role: string;
  job_url: string;
  platform: string;
  applied_as: string;
  rate_offered: string;
  applied_at: string;
  deadline: string;
  contact_name: string;
  contact_email: string;
  company_domain: string;
  next_action: string;
  next_action_at: string;
  notes: string;
};

export default function EditDetails({ values }: { values: DetailsValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveDetails, {});
  return (
    <details className="group rounded-[22px] border border-black/[0.07] bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-4 text-[15px] font-bold text-ink sm:px-5 [&::-webkit-details-marker]:hidden">
        <Pencil className="h-4 w-4 text-[#B34100]" aria-hidden />
        Edit details
        <span className="ml-auto text-xs font-semibold text-[#6B645D] group-open:hidden">Company, rate, contact, dates, notes</span>
      </summary>
      <form action={action} className="space-y-4 border-t border-black/[0.06] p-4 sm:p-5">
        <input type="hidden" name="id" value={values.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="d-company">
              Company
            </label>
            <input id="d-company" name="company" defaultValue={values.company} maxLength={200} className={input} />
            <p className="mt-1 text-xs text-[#6B645D]">Leave empty if the post does not say; it shows as &quot;Unnamed company&quot;.</p>
          </div>
          <div>
            <label className={label} htmlFor="d-role">
              Role
            </label>
            <input id="d-role" name="role" required defaultValue={values.role} maxLength={200} className={input} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="d-url">
            Job post link
          </label>
          <input id="d-url" name="job_url" type="url" inputMode="url" defaultValue={values.job_url} maxLength={2000} placeholder="https://" className={input} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="d-platform">
              Platform
            </label>
            <select id="d-platform" name="platform" defaultValue={values.platform} className={input}>
              <option value="">—</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="d-as">
              Applied as
            </label>
            <select id="d-as" name="applied_as" defaultValue={values.applied_as} className={input}>
              <option value="">—</option>
              {APPLIED_AS.map((a) => (
                <option key={a} value={a}>
                  {APPLIED_AS_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="d-rate">
              Rate offered
            </label>
            <input id="d-rate" name="rate_offered" defaultValue={values.rate_offered} maxLength={200} placeholder="e.g. $8/hr" className={input} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="d-applied">
              Applied on
            </label>
            <input id="d-applied" name="applied_at" type="datetime-local" defaultValue={values.applied_at} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="d-deadline">
              Deadline
            </label>
            <input id="d-deadline" name="deadline" type="datetime-local" defaultValue={values.deadline} className={input} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="d-cname">
              Contact name
            </label>
            <input id="d-cname" name="contact_name" defaultValue={values.contact_name} maxLength={200} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="d-cemail">
              Contact email
            </label>
            <input id="d-cemail" name="contact_email" type="email" inputMode="email" defaultValue={values.contact_email} maxLength={320} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="d-domain">
              Company website
            </label>
            <input id="d-domain" name="company_domain" defaultValue={values.company_domain} maxLength={200} placeholder="acme.com" className={input} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-[#6B645D]">
          The contact email and company website help the inbox watcher recognise replies from this company.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="d-next">
              Next action
            </label>
            <input id="d-next" name="next_action" defaultValue={values.next_action} maxLength={500} placeholder="e.g. Send the Loom" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="d-nextat">
              Next action date
            </label>
            <input id="d-nextat" name="next_action_at" type="datetime-local" defaultValue={values.next_action_at} className={input} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="d-notes">
            Notes
          </label>
          <textarea id="d-notes" name="notes" rows={5} defaultValue={values.notes} maxLength={20000} className={input} />
        </div>

        <FormNote state={state} />
        <SubmitButton className={btnPrimary} pendingLabel="Saving…">
          Save changes
        </SubmitButton>
      </form>
    </details>
  );
}
