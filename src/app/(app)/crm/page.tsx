import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { listClients, listLeads } from "@/lib/crm";
import { StatusBadge, StageLabel, PIPELINE_STAGES, fmtDate } from "./_components/badges";

function rateOf(billingRates: { rate: unknown }[]): string {
  const r = billingRates[0]?.rate;
  return r ? `$${String(r)}/hr` : "—";
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showLeads = tab === "leads";

  const [clients, leads] = await Promise.all([listClients(), listLeads()]);

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-bold transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full bg-cream border border-black/10 p-1">
          <Link href="/crm" className={tabCls(!showLeads)}>
            Clients ({clients.length})
          </Link>
          <Link href="/crm?tab=leads" className={tabCls(showLeads)}>
            Leads ({leads.length})
          </Link>
        </div>
        <Link
          href="/crm/new"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New
        </Link>
      </div>

      {showLeads ? (
        /* ── LEADS PIPELINE ── */
        leads.length === 0 ? (
          <EmptyState label="No leads yet. Add one to start tracking your pipeline." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {PIPELINE_STAGES.map((stage) => {
              const col = leads.filter((l) => l.pipelineStage === stage);
              return (
                <div key={stage} className="bg-cream rounded-2xl border border-black/[0.06] p-3">
                  <div className="flex items-center justify-between px-1 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink/60">
                      <StageLabel stage={stage} />
                    </span>
                    <span className="text-[11px] font-bold text-ink/35">{col.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/crm/${lead.id}`}
                        className="block bg-white rounded-xl border border-black/10 p-3 hover:border-brand/50 hover:shadow-sm transition"
                      >
                        <p className="font-bold text-ink text-sm leading-tight">
                          {lead.companyName}
                        </p>
                        {lead.serviceType && (
                          <p className="text-xs text-black/45 mt-0.5">{lead.serviceType}</p>
                        )}
                        {lead.contacts[0] && (
                          <p className="text-xs text-black/40 mt-2">{lead.contacts[0].name}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : /* ── CLIENTS TABLE ── */ clients.length === 0 ? (
        <EmptyState label="No clients yet. Add your first client to get started." />
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink/45 border-b border-black/[0.07]">
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Primary Contact</th>
                  <th className="px-5 py-3">Rate</th>
                  <th className="px-5 py-3">Projects</th>
                  <th className="px-5 py-3">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-black/[0.05] last:border-0 hover:bg-cream/60 transition"
                  >
                    <td className="px-5 py-3">
                      <Link href={`/crm/${c.id}`} className="font-bold text-ink hover:text-brand flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: c.colorHex ?? "#cbd5e1" }}
                        />
                        {c.companyName}
                      </Link>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-black/60">{c.serviceType ?? "—"}</td>
                    <td className="px-5 py-3 text-black/60">{c.contacts[0]?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-black/60">{rateOf(c.billingRates)}</td>
                    <td className="px-5 py-3 text-black/60">{c._count.projects}</td>
                    <td className="px-5 py-3 text-black/60">{fmtDate(c.renewalDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
      <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-6 h-6" />
      </div>
      <p className="text-black/50">{label}</p>
    </div>
  );
}
