import { getPortalContext } from "@/lib/portal/dal";
import { listBusinesses } from "@/lib/portal/data";
import { STATUS_META, STATUS_ORDER, statusLabel } from "@/lib/portal/shared";

// The "Monthly workflow, logins and vault rules" screen from the design.
export default async function HowItWorksPage({ params }: PageProps<"/portal/[slug]/how-it-works">) {
  const { slug } = await params;
  const ctx = await getPortalContext(slug);
  const businesses = await listBusinesses(ctx.client.id);
  const n = ctx.firstName;

  const steps = [
    ["1st business day", "Kickoff", `Recurring tasks are in place, carry-overs reviewed, the month plan is ready for ${n}.`],
    ["Any time", "Capture", `New requests from email, calls, texts or ${n}'s own tasks and comments go straight into the month.`],
    ["While open", "Work", "In progress or Waiting on. Checked daily only when something is open."],
    ["As needed", n, "Only when he must approve, decide or sign, with a one-line ask."],
    ["Around the 15th", "Mid-month check", "Short note: on track, slipping, or nothing to report."],
    ["Last business day", "Month-end report", "Done by business, carried over, next month preview. Built from the list."],
  ];
  const roles = [
    [n, "Owner", "Sees every business and month. Creates, assigns, edits, approves, deletes and restores tasks. Full Vault access."],
    ["EA team", "Editors", "Create and update tasks, upload documents, run reports. Full Vault access."],
    ["Others later", "Limited guests", `Optional, only with ${n}'s OK.`],
  ];
  const vault = [
    "Passwords live in an encrypted password manager, never in a doc, sheet, task or email.",
    "The Vault shows each login's business, who it is shared with, 2-step status and last change date.",
    "Opening a login goes through the password manager, which asks for its own verification. Every open is logged.",
    `Every file in the Vault is open to ${n} and the EA team.`,
    "Each business has its own folder; nonprofit files never sit in a private-business folder.",
    "Monthly: review who has access, flag passwords older than 6 months and documents expiring in 60 days.",
  ];
  const rules = [
    "One list, filtered by business and month. Never separate tools per business.",
    "Every task has one business, one month, one owner, one due date and one next action.",
    `"Needs ${n}" means only he can move it, and the card says exactly what to do.`,
    "Nothing sits in \"Waiting on\" without a name and a chase date.",
    "No busywork: a quiet week stays quiet. The month-end report is the one guaranteed touchpoint.",
    "The nonprofit stays walled off from private businesses and church: own folders, tags and signatures.",
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="p-h1">How the Command Center runs</h1>
        <p className="p-muted mt-1">Planned by the month. Quiet weeks are normal, and simply show as &ldquo;Quiet&rdquo;.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="p-h2">The monthly cycle</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map(([when, name, desc], i) => (
            <div
              key={when + name}
              className="rounded-xl p-4 flex flex-col gap-1.5"
              style={i === 3 ? { background: "#FFF7ED", border: "2px solid #C2410C" } : { background: "#fff", border: "1px solid #E5E7EB" }}
            >
              <span className="text-[12px] font-semibold p-faint">{when}</span>
              <span className="font-bold">{name}</span>
              <span className="text-[13px] p-muted">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="p-h2">Five statuses, no more</h2>
        <div className="p-card divide-y divide-[var(--p-line)]">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex items-center gap-4 px-4 py-3">
              <span className="p-pill w-[130px]" style={{ background: STATUS_META[s].bg, color: STATUS_META[s].fg }}>
                {statusLabel(s, n)}
              </span>
              <span className="text-[14px]">{STATUS_META[s].rule.replace("your", `${n}'s`)}</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] p-muted">Unfinished tasks roll into the next month automatically and are marked &ldquo;Carried over&rdquo;.</p>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="p-h2">Logins and what each person can do</h2>
          <div className="p-card divide-y divide-[var(--p-line)]">
            {roles.map(([who, role, can]) => (
              <div key={who} className="px-4 py-3">
                <p className="font-bold">
                  {who} <span className="font-semibold p-faint text-[13px]">· {role}</span>
                </p>
                <p className="text-[13px] p-muted">{can}</p>
              </div>
            ))}
          </div>
          <p className="text-[13px] p-muted">Everyone signs in with their own account; no shared logins. Two-step verification is optional and can be turned on in Settings.</p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="p-h2">Vault rules</h2>
          <ul className="p-card px-4 py-3 flex flex-col gap-2 list-disc pl-8">
            {vault.map((v) => (
              <li key={v} className="text-[14px]">
                {v}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="p-h2">Workstreams per business</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {businesses.map((b) => (
            <div key={b.id} className="rounded-xl p-4 bg-white" style={{ borderTop: `5px solid ${b.portalColor ?? "#374151"}`, borderRadius: 0 }}>
              <p className="font-bold mb-1.5" style={{ color: b.portalColor ?? undefined }}>
                {b.portalShort}
              </p>
              <ul className="text-[13px] flex flex-col gap-0.5">
                {b.workstreams.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              {b.portalNote && <p className="text-[12px] p-faint mt-2">{b.portalNote}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="p-h2">Rules that keep it trustworthy</h2>
        <ol className="p-card divide-y divide-[var(--p-line)]">
          {rules.map((r, i) => (
            <li key={r} className="flex gap-3 px-4 py-3">
              <span className="font-bold w-5">{i + 1}</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
