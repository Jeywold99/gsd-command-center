import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, ExternalLink, Plus } from "lucide-react";
import { getClientById } from "@/lib/crm";
import { StatusBadge, HealthDot, StageLabel, fmtDate } from "../_components/badges";
import BillingRateForm from "../_components/rate-form";
import {
  addNote,
  addContact,
  updateClientStatus,
  updateLeadStage,
  convertToClient,
} from "../actions";

// A billing entry → readable label ("$150/hr" or "10 hrs/wk").
function fmtRate(r: { type: string; rate: unknown; hoursPerWeek: unknown }): string {
  return r.type === "FIXED"
    ? `${r.hoursPerWeek != null ? String(r.hoursPerWeek) : "—"} hrs/wk`
    : `$${r.rate != null ? String(r.rate) : "—"}/hr`;
}

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const smallBtn =
  "bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-3.5 py-2 rounded-full transition-colors";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const isLead = client.status === "LEAD";
  const currentRate = client.billingRates[0];

  return (
    <div className="space-y-6">
      <Link
        href={isLead ? "/crm?tab=leads" : "/crm"}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to CRM
      </Link>

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ background: client.colorHex ?? "#cbd5e1" }}
              />
              <h2 className="font-display text-4xl tracking-wide text-ink leading-none">
                {client.companyName}
              </h2>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={client.status} />
              {isLead && client.pipelineStage && (
                <span className="text-xs font-semibold text-ink/50">
                  Stage: <StageLabel stage={client.pipelineStage} />
                </span>
              )}
              <HealthDot health={client.health} />
              {client.serviceType && (
                <span className="text-xs text-black/50">· {client.serviceType}</span>
              )}
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <Link
            href={`/crm/${client.id}/edit`}
            className="inline-flex items-center gap-1.5 border border-black/10 text-ink/70 hover:text-ink hover:bg-cream text-sm font-semibold px-3.5 py-2 rounded-full transition"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
        </div>

        {/* Status / pipeline controls */}
        <div className="mt-5 pt-5 border-t border-black/[0.07] flex flex-wrap items-end gap-3">
          {isLead ? (
            <>
              <form action={updateLeadStage} className="flex items-end gap-2">
                <input type="hidden" name="id" value={client.id} />
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-1">
                    Pipeline Stage
                  </label>
                  <select name="pipelineStage" defaultValue={client.pipelineStage ?? "NEW"} className={input}>
                    {["NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].map((s) => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="border border-black/10 text-ink/70 hover:bg-cream text-xs font-bold uppercase tracking-wide px-3.5 py-2 rounded-full transition">
                  Save
                </button>
              </form>
              <form action={convertToClient}>
                <input type="hidden" name="id" value={client.id} />
                <button type="submit" className={smallBtn}>Convert to Client →</button>
              </form>
            </>
          ) : (
            <form action={updateClientStatus} className="flex items-end gap-2">
              <input type="hidden" name="id" value={client.id} />
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-1">
                  Status
                </label>
                <select name="status" defaultValue={client.status} className={input}>
                  {["ACTIVE", "PAUSED", "CHURNED"].map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="border border-black/10 text-ink/70 hover:bg-cream text-xs font-bold uppercase tracking-wide px-3.5 py-2 rounded-full transition">
                Save
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Activity + Projects ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity */}
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Activity</h3>
            <form action={addNote} className="mb-5">
              <input type="hidden" name="clientId" value={client.id} />
              <textarea
                name="body"
                rows={2}
                required
                placeholder="Log a call, update, or note…"
                className={input}
              />
              <div className="mt-2 flex justify-end">
                <button type="submit" className={smallBtn}>Add Note</button>
              </div>
            </form>

            {client.notes.length === 0 ? (
              <p className="text-sm text-black/40">No activity logged yet.</p>
            ) : (
              <ul className="space-y-4">
                {client.notes.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-cream text-ink/60 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {n.author.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-ink whitespace-pre-wrap">{n.body}</p>
                      <p className="text-[11px] text-black/40 mt-0.5">
                        {n.author.name} · {fmtDate(n.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Projects */}
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Projects</h3>
            {client.projects.length === 0 ? (
              <p className="text-sm text-black/40">
                No projects yet. Projects arrive in Phase 2.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {client.projects.map((p) => (
                  <li key={p.id} className="py-2.5 flex justify-between text-sm">
                    <span className="font-semibold text-ink">{p.name}</span>
                    <span className="text-black/45">{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Right: Details, Contacts, Billing ── */}
        <div className="space-y-6">
          {/* Details */}
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Details</h3>
            <dl className="space-y-2.5 text-sm">
              <Row k="Service" v={client.serviceType ?? "—"} />
              <Row k="Start date" v={fmtDate(client.startDate)} />
              <Row k="Renewal" v={fmtDate(client.renewalDate)} />
              <Row k="Currency" v={client.currency} />
              <Row k="Added" v={fmtDate(client.createdAt)} />
            </dl>
          </section>

          {/* Contacts */}
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Contacts</h3>
            {client.contacts.length === 0 ? (
              <p className="text-sm text-black/40 mb-3">No contacts yet.</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {client.contacts.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{c.name}</span>
                      {c.isPrimary && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-brand bg-brand-pale px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    {c.title && <p className="text-xs text-black/45">{c.title}</p>}
                    {c.email && <p className="text-xs text-black/55">{c.email}</p>}
                    {c.phone && <p className="text-xs text-black/55">{c.phone}</p>}
                  </li>
                ))}
              </ul>
            )}

            <details className="group">
              <summary className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand cursor-pointer list-none">
                <Plus className="w-3.5 h-3.5" /> Add contact
              </summary>
              <form action={addContact} className="mt-3 space-y-2">
                <input type="hidden" name="clientId" value={client.id} />
                <input name="name" required placeholder="Name *" className={input} />
                <input name="title" placeholder="Title" className={input} />
                <input name="email" type="email" placeholder="Email" className={input} />
                <input name="phone" placeholder="Phone" className={input} />
                <label className="flex items-center gap-2 text-xs text-ink/60">
                  <input type="checkbox" name="isPrimary" /> Primary contact
                </label>
                <button type="submit" className={smallBtn}>Add</button>
              </form>
            </details>
          </section>

          {/* Billing */}
          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Billing</h3>
            {currentRate ? (
              <>
                <p className="text-3xl font-display text-ink tracking-wide">
                  {currentRate.type === "FIXED" ? (
                    <>
                      {currentRate.hoursPerWeek != null ? String(currentRate.hoursPerWeek) : "—"}
                      <span className="text-base text-black/40"> hrs/wk</span>
                    </>
                  ) : (
                    <>
                      ${currentRate.rate != null ? String(currentRate.rate) : "—"}
                      <span className="text-base text-black/40"> /hr</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-black/40 mt-1">
                  {currentRate.type === "FIXED" ? "Fixed retainer · " : ""}
                  Since {fmtDate(currentRate.effectiveFrom)}
                </p>
              </>
            ) : (
              <p className="text-3xl font-display text-ink tracking-wide">—</p>
            )}

            <BillingRateForm clientId={client.id} />

            {client.billingRates.length > 1 && (
              <div className="mt-4 pt-4 border-t border-black/[0.06]">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40 mb-2">
                  History
                </p>
                <ul className="space-y-1.5 text-xs text-black/50">
                  {client.billingRates.slice(1).map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>{fmtRate(r)}</span>
                      <span>{fmtDate(r.effectiveFrom)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-black/45">{k}</dt>
      <dd className="text-ink font-medium text-right">{v}</dd>
    </div>
  );
}
