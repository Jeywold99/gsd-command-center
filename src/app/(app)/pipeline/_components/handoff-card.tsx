"use client";

import { useActionState } from "react";
import { PartyPopper } from "lucide-react";
import { createClientAndProject } from "../handoff-actions";
import { CURRENCIES } from "@/lib/pipeline/handoff";
import type { HandoffState } from "@/lib/pipeline/types";
import { SubmitButton } from "./form-bits";
import { btnPrimary, card, input, label } from "./styles";

export type HandoffDefaults = {
  companyName: string;
  serviceType: string;
  currency: string;
  hourlyRate: string;
  hoursPerWeek: string;
  payFrequency: string;
  website: string;
  contactName: string;
  contactEmail: string;
  projectName: string;
  startDate: string; // YYYY-MM-DD
};

// Shown on a Hired application that is not yet linked: create the client + project in the Command Center.
export default function HandoffCard({
  applicationId,
  defaults,
  rateText,
  existingClient,
  taskCount,
}: {
  applicationId: string;
  defaults: HandoffDefaults;
  rateText: string | null;
  existingClient: { id: string; name: string } | null;
  taskCount: number;
}) {
  const [state, action] = useActionState<HandoffState, FormData>(createClientAndProject, {});
  const unnamed = !defaults.companyName;

  return (
    <section className={`${card} border-success/40 bg-success/[0.06]`} aria-labelledby="handoff-h">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-success text-white">
          <PartyPopper className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 id="handoff-h" className="font-display text-[28px] leading-none tracking-[0.01em]">
            You got the job. Set it up in the Command Center
          </h3>
          <p className="mt-1.5 text-sm text-[#6B645D]">
            Creates the client and a project, and turns{" "}
            {taskCount > 0 ? `the ${taskCount} open to-do${taskCount === 1 ? "" : "s"}` : "the open to-dos"} into starter tasks. Check the
            details first; you can change everything later in the CRM and Projects.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="id" value={applicationId} />
        {state.partial && (
          <>
            <input type="hidden" name="retryClientId" value={state.partial.clientId} />
            <input type="hidden" name="retryProjectId" value={state.partial.projectId} />
          </>
        )}
        {existingClient && (
          <label className="flex items-start gap-2.5 rounded-[12px] bg-white px-3.5 py-3 text-sm">
            <input type="checkbox" name="reuseClientId" value={existingClient.id} defaultChecked className="mt-0.5 h-4 w-4 accent-[#FF5C00]" />
            <span>
              <span className="font-bold">Use the existing client &quot;{existingClient.name}&quot;</span>
              <span className="block text-[13px] text-[#6B645D]">A client with this name is already in your CRM. Untick to create a separate one.</span>
            </span>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="h-company">
              Company name
            </label>
            <input id="h-company" name="companyName" required defaultValue={defaults.companyName} maxLength={200} className={input} />
            {unnamed && <p className="mt-1 text-xs font-semibold text-[#B34100]">The post never named the company. Type the real name.</p>}
          </div>
          <div>
            <label className={label} htmlFor="h-service">
              What you do for them
            </label>
            <input id="h-service" name="serviceType" defaultValue={defaults.serviceType} maxLength={200} className={input} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={label} htmlFor="h-rate">
              Hourly rate
            </label>
            <input id="h-rate" name="hourlyRate" inputMode="decimal" defaultValue={defaults.hourlyRate} placeholder="e.g. 8" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="h-cur">
              Currency
            </label>
            <select id="h-cur" name="currency" defaultValue={defaults.currency} className={input}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="h-hours">
              Hours per week
            </label>
            <input id="h-hours" name="hoursPerWeek" inputMode="decimal" defaultValue={defaults.hoursPerWeek} placeholder="e.g. 20" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="h-pay">
              Paid
            </label>
            <select id="h-pay" name="payFrequency" defaultValue={defaults.payFrequency} className={input}>
              <option value="">Not sure yet</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Every 2 weeks</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        </div>
        {rateText && (
          <p className="-mt-2 text-xs text-[#6B645D]">
            The post said: &quot;{rateText}&quot;.{" "}
            {defaults.hourlyRate ? "The rate above was read from it." : "Type the rate you agreed, as a single number."}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="h-cname">
              Contact name
            </label>
            <input id="h-cname" name="contactName" defaultValue={defaults.contactName} maxLength={200} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="h-cemail">
              Contact email
            </label>
            <input id="h-cemail" name="contactEmail" type="email" inputMode="email" defaultValue={defaults.contactEmail} maxLength={320} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="h-web">
              Website
            </label>
            <input id="h-web" name="website" defaultValue={defaults.website} maxLength={200} className={input} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="h-project">
              Project name
            </label>
            <input id="h-project" name="projectName" required defaultValue={defaults.projectName} maxLength={200} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="h-start">
              Start date
            </label>
            <input id="h-start" name="startDate" type="date" defaultValue={defaults.startDate} className={input} />
          </div>
        </div>

        {taskCount > 0 && (
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="createTasks" defaultChecked className="mt-0.5 h-4 w-4 accent-[#FF5C00]" />
            <span className="font-semibold">
              Create {taskCount} starter task{taskCount === 1 ? "" : "s"} from the open requirements
            </span>
          </label>
        )}

        {state.error && (
          <p role="alert" className="rounded-[12px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}
        <SubmitButton className={btnPrimary} pendingLabel="Setting it up…">
          {state.partial ? "Finish linking" : "Create client and project"}
        </SubmitButton>
      </form>
    </section>
  );
}
