import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { requirePipelineAccess } from "@/lib/pipeline/access";
import { ago, dueIn, fmtDay, fmtDayTime, toInputLocal } from "@/lib/pipeline/format";
import { getApplication, listEvents, listRequirements } from "@/lib/pipeline/queries";
import { APPLIED_AS_LABEL, PLATFORM_LABEL } from "@/lib/pipeline/types";
import EditDetails from "../../_components/edit-details";
import LogActivity from "../../_components/log-activity";
import Requirements, { type RequirementView } from "../../_components/requirements";
import StatusPicker from "../../_components/status-picker";
import { card, eyebrow } from "../../_components/styles";
import Timeline from "../../_components/timeline";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={eyebrow}>{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-ink">{children}</p>
    </div>
  );
}

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePipelineAccess();
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) notFound();

  const [reqs, events] = await Promise.all([listRequirements(id), listEvents(id)]);

  const reqViews: RequirementView[] = reqs.map((r) => {
    const due = r.due_at ? dueIn(r.due_at) : null;
    return {
      id: r.id,
      type: r.type,
      description: r.description,
      link: r.link,
      status: r.status,
      dueText: r.due_at ? `${fmtDayTime(r.due_at)}${due?.label ? ` (${due.label})` : ""}` : null,
      dueLate: Boolean(due?.late),
    };
  });

  const nextDue = app.next_action_at ? dueIn(app.next_action_at) : null;

  return (
    <div className="space-y-5">
      <Link
        href="/pipeline/applications"
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#B34100] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All applications
      </Link>

      {/* Header */}
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={eyebrow}>
              {app.person_name}
              {app.platform ? ` · ${PLATFORM_LABEL[app.platform] ?? app.platform}` : ""}
              {app.applied_as ? ` · as ${APPLIED_AS_LABEL[app.applied_as] ?? app.applied_as}` : ""}
            </p>
            <h2 className="mt-1 break-words font-display text-[44px] leading-[0.95] tracking-[0.01em] text-ink lg:text-[56px]">
              {app.company}
            </h2>
            <p className="mt-1.5 break-words text-base font-semibold text-ink/80">{app.role}</p>
          </div>
          <StatusPicker id={app.id} status={app.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {app.job_url && (
            <a
              href={app.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-black/10 px-4 text-sm font-bold text-ink hover:border-brand/50"
            >
              <ExternalLink className="h-4 w-4" aria-hidden /> Job post
            </a>
          )}
          {app.contact_email && (
            <a
              href={`mailto:${app.contact_email}`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-black/10 px-4 text-sm font-bold text-ink hover:border-brand/50"
            >
              <Mail className="h-4 w-4" aria-hidden /> {app.contact_name ?? app.contact_email}
            </a>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-black/[0.06] pt-4 sm:grid-cols-4">
          <Fact label="Rate">{app.rate_offered ?? "—"}</Fact>
          <Fact label="Applied">{app.applied_at ? fmtDay(app.applied_at) : "—"}</Fact>
          <Fact label="Last activity">{ago(app.last_activity_at)}</Fact>
          <Fact label="Deadline">{app.deadline ? fmtDayTime(app.deadline) : "—"}</Fact>
        </dl>

        {(app.next_action || app.next_action_at) && (
          <div className="mt-4 rounded-[16px] bg-brand-pale px-4 py-3">
            <p className={`${eyebrow} !text-[#B34100]`}>Next action</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">
              {app.next_action ?? "Follow up"}
              {app.next_action_at && (
                <span className={`ml-2 font-medium ${nextDue?.late ? "text-red-700" : "text-ink/70"}`}>
                  {fmtDayTime(app.next_action_at)}
                  {nextDue?.label ? ` (${nextDue.label})` : ""}
                </span>
              )}
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className={card} aria-labelledby="req-h">
            <h3 id="req-h" className="mb-1 font-display text-[28px] leading-none tracking-[0.01em]">
              Requirements
            </h3>
            <Requirements applicationId={app.id} items={reqViews} />
          </section>

          <section className={card} aria-labelledby="log-h">
            <h3 id="log-h" className="mb-3 font-display text-[28px] leading-none tracking-[0.01em]">
              Log activity
            </h3>
            <LogActivity applicationId={app.id} />
          </section>
        </div>

        <section className={`${card} h-fit`} aria-labelledby="hist-h">
          <h3 id="hist-h" className="mb-4 font-display text-[28px] leading-none tracking-[0.01em]">
            History
          </h3>
          <Timeline events={events} />
        </section>
      </div>

      <EditDetails
        values={{
          id: app.id,
          company: app.company === "Unnamed company" ? "" : app.company,
          role: app.role,
          job_url: app.job_url ?? "",
          platform: app.platform ?? "",
          applied_as: app.applied_as ?? "",
          rate_offered: app.rate_offered ?? "",
          applied_at: toInputLocal(app.applied_at),
          deadline: toInputLocal(app.deadline),
          contact_name: app.contact_name ?? "",
          contact_email: app.contact_email ?? "",
          company_domain: app.company_domain ?? "",
          next_action: app.next_action ?? "",
          next_action_at: toInputLocal(app.next_action_at),
          notes: app.notes ?? "",
        }}
      />

      {app.notes && (
        <section className={card} aria-labelledby="notes-h">
          <h3 id="notes-h" className="mb-2 font-display text-[28px] leading-none tracking-[0.01em]">
            Notes
          </h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/85">{app.notes}</p>
        </section>
      )}

      {app.job_description && (
        <details className="group rounded-[22px] border border-black/[0.07] bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center px-4 text-[15px] font-bold text-ink sm:px-5 [&::-webkit-details-marker]:hidden">
            Job post text
            <span className="ml-auto text-xs font-semibold text-[#6B645D] group-open:hidden">Show</span>
          </summary>
          <p className="whitespace-pre-wrap break-words border-t border-black/[0.06] p-4 text-sm leading-relaxed text-ink/80 sm:p-5">
            {app.job_description.length > 8000 ? `${app.job_description.slice(0, 8000)}…` : app.job_description}
          </p>
        </details>
      )}
    </div>
  );
}
