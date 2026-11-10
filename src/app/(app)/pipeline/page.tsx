import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCheck, ListChecks, MailQuestion, Timer } from "lucide-react";
import { requirePipelineAccess } from "@/lib/pipeline/access";
import { ago, dueIn, fmtDayTime, optionLabel, pct } from "@/lib/pipeline/format";
import {
  getDigest,
  getPipelineStats,
  listApplicationOptions,
  listApplications,
  listUnmatchedEmails,
} from "@/lib/pipeline/queries";
import { ACTIVE_STATUSES, REQUIREMENT_LABEL, STATUS_LABEL, type Status } from "@/lib/pipeline/types";
import EmailReview, { type EmailView } from "./_components/email-review";
import StatusChip from "./_components/status-chip";
import { card, eyebrow } from "./_components/styles";

function reasonText(note: string | undefined): string {
  if (!note || note === "no_match") return "No application matches this sender or company.";
  if (note.startsWith("ambiguous")) return "More than one application could match.";
  if (note === "classification_failed") return "The AI could not read this email.";
  return "Needs a human look.";
}

function Tile({ label, value, icon: Icon, hot }: { label: string; value: number; icon: typeof Timer; hot?: boolean }) {
  return (
    <div className={`rounded-[20px] p-4 ${hot && value > 0 ? "bg-midnight text-white" : "border border-black/[0.07] bg-white"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${hot && value > 0 ? "text-white/65" : "text-[#6B645D]"}`}>{label}</span>
        <Icon className={`h-4 w-4 ${hot && value > 0 ? "text-brand" : "text-[#B34100]"}`} aria-hidden />
      </div>
      <p className="mt-2 font-display text-[44px] leading-none">{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={card}>
      <div className="mb-3 flex items-baseline gap-2.5">
        <h3 className="font-display text-[28px] leading-none tracking-[0.01em]">{title}</h3>
        <span className="rounded-full bg-brand-pale px-2 py-0.5 text-xs font-bold text-[#B34100]">{count}</span>
      </div>
      {hint && <p className="-mt-1 mb-3 text-[13px] text-[#6B645D]">{hint}</p>}
      {children}
    </section>
  );
}

function Row({
  id,
  title,
  sub,
  right,
}: {
  id: string;
  title: string;
  sub?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={`/pipeline/applications/${id}`}
        className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-2.5 transition hover:bg-cream"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-ink">{title}</span>
          {sub && <span className="block truncate text-[13px] text-[#6B645D]">{sub}</span>}
        </span>
        {right && <span className="shrink-0 text-right text-[13px] font-semibold text-[#6B645D]">{right}</span>}
        <ArrowRight className="h-4 w-4 shrink-0 text-black/25" aria-hidden />
      </Link>
    </li>
  );
}

export default async function TodayPage() {
  const viewer = await requirePipelineAccess();
  const [digest, unmatched, options, stats, all] = await Promise.all([
    getDigest(viewer.person),
    listUnmatchedEmails(viewer.personId),
    listApplicationOptions(viewer.personId),
    getPipelineStats(),
    listApplications(),
  ]);

  const mine = all.filter((a) => a.person_id === viewer.personId);
  const activeCount = mine.filter((a) => (ACTIVE_STATUSES as Status[]).includes(a.status)).length;
  const readyCount = mine.filter((a) => a.ready_to_send).length;

  const emails: EmailView[] = unmatched.map((u) => {
    const company = u.classification?.company?.trim().toLowerCase();
    const same = company ? options.filter((o) => o.company.trim().toLowerCase() === company) : [];
    return {
      id: u.id,
      from: u.from_address,
      subject: u.subject,
      snippet: u.snippet,
      receivedText: u.received_at ? ago(u.received_at) : "time unknown",
      reason: reasonText(u.classification?.match_note),
      category: u.classification?.category ?? null,
      summary: u.classification?.summary ?? null,
      suggestedId: same.length === 1 ? same[0].id : null,
    };
  });
  const choices = options.map((o) => ({ id: o.id, label: optionLabel(o.company, o.role, o.status) }));

  const nothing =
    digest.empty && emails.length === 0 && digest.follow_ups.length === 0 && digest.requirements_due.length === 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Active" value={activeCount} icon={ListChecks} />
        <Tile label="Follow up" value={digest.follow_ups.length} icon={Timer} hot />
        <Tile label="Due in 48h" value={digest.requirements_due.length} icon={CalendarClock} hot />
        <Tile label="Emails to review" value={emails.length} icon={MailQuestion} hot />
      </div>

      {emails.length > 0 && (
        <Section
          title="Emails to review"
          count={emails.length}
          hint="The inbox watcher was not sure which application these belong to. Pick one and it is logged, with the status moved forward if the email says so."
        >
          <EmailReview emails={emails} choices={choices} />
        </Section>
      )}

      {nothing && (
        <section className={`${card} flex items-center gap-3`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-success/15 text-[#0B7A52]">
            <CheckCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-bold">You are all caught up.</p>
            <p className="text-sm text-[#6B645D]">
              {readyCount > 0 ? `${readyCount} application${readyCount === 1 ? " is" : "s are"} ready to send.` : "No follow-ups, deadlines or emails waiting."}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {digest.requirements_due.length > 0 && (
          <Section title="Due soon" count={digest.requirements_due.length} hint="Requirements due within 48 hours or already late.">
            <ul>
              {digest.requirements_due.map((r, i) => {
                const due = dueIn(r.due_at);
                return (
                  <Row
                    key={`${r.application_id}-${i}`}
                    id={r.application_id}
                    title={r.company}
                    sub={`${REQUIREMENT_LABEL[r.requirement_type] ?? r.requirement_type}${r.description ? `: ${r.description}` : ""}`}
                    right={<span className={due.late ? "text-red-700" : ""}>{due.label || fmtDayTime(r.due_at)}</span>}
                  />
                );
              })}
            </ul>
          </Section>
        )}

        {digest.follow_ups.length > 0 && (
          <Section title="Follow up" count={digest.follow_ups.length} hint="No news for 7 days or more. A short nudge restarts the clock.">
            <ul>
              {digest.follow_ups.map((f) => (
                <Row
                  key={f.application_id}
                  id={f.application_id}
                  title={f.company}
                  sub={f.next_action ?? f.role}
                  right={
                    <span className="flex flex-col items-end gap-1">
                      <StatusChip status={f.status} />
                      <span>{f.days_since_last_contact != null ? `${f.days_since_last_contact}d quiet` : ""}</span>
                    </span>
                  }
                />
              ))}
            </ul>
          </Section>
        )}

        {digest.upcoming.length > 0 && (
          <Section title="Interviews and trials" count={digest.upcoming.length}>
            <ul>
              {digest.upcoming.map((u) => (
                <Row
                  key={u.application_id}
                  id={u.application_id}
                  title={u.company}
                  sub={u.next_action ?? u.role}
                  right={
                    <span className="flex flex-col items-end gap-1">
                      <StatusChip status={u.status} />
                      <span>{u.next_action_at ? fmtDayTime(u.next_action_at) : "no date set"}</span>
                    </span>
                  }
                />
              ))}
            </ul>
          </Section>
        )}

        {digest.stuck_drafting.length > 0 && (
          <Section title="Still drafting" count={digest.stuck_drafting.length} hint="Not sent yet, with things left to do.">
            <ul>
              {digest.stuck_drafting.map((d) => (
                <Row
                  key={d.application_id}
                  id={d.application_id}
                  title={d.company}
                  sub={d.open_requirements.map((r) => REQUIREMENT_LABEL[r.type] ?? r.type).join(", ")}
                  right={`${d.missing_count} to do`}
                />
              ))}
            </ul>
          </Section>
        )}

        {digest.status_changes.length > 0 && (
          <Section title="Changed in the last 24h" count={digest.status_changes.length}>
            <ul className="space-y-2.5">
              {digest.status_changes.map((c, i) => (
                <li key={i} className="text-sm">
                  <p className="font-bold text-ink">{c.company}</p>
                  <p className="text-[13px] text-[#6B645D]">
                    {c.from_status ? STATUS_LABEL[c.from_status] : "—"} → {c.to_status ? STATUS_LABEL[c.to_status] : "—"} ·{" "}
                    {c.created_by === "n8n" ? "from an email" : c.created_by} · {ago(c.occurred_at)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {stats.length > 0 && (
        <section className={card} aria-labelledby="funnel-h">
          <h3 id="funnel-h" className="mb-4 font-display text-[28px] leading-none tracking-[0.01em]">
            How it is going
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((s) => (
              <div key={s.person_id} className="rounded-[18px] bg-cream p-4">
                <p className={eyebrow}>{s.person_name}</p>
                <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <dd className="font-display text-[34px] leading-none">{s.sent}</dd>
                    <dt className="mt-1 text-[11px] font-semibold text-[#6B645D]">Sent</dt>
                  </div>
                  <div>
                    <dd className="font-display text-[34px] leading-none">{s.got_reply}</dd>
                    <dt className="mt-1 text-[11px] font-semibold text-[#6B645D]">Replies · {pct(s.reply_rate)}</dt>
                  </div>
                  <div>
                    <dd className="font-display text-[34px] leading-none">{s.got_interview}</dd>
                    <dt className="mt-1 text-[11px] font-semibold text-[#6B645D]">Interviews · {pct(s.interview_rate)}</dt>
                  </div>
                  <div>
                    <dd className="font-display text-[34px] leading-none">{s.hired}</dd>
                    <dt className="mt-1 text-[11px] font-semibold text-[#6B645D]">Hired</dt>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
