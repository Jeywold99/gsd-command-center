import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { listClients, listLeads, listChurnedClients } from "@/lib/crm";
import { computeClientHealthMap, type ComputedHealth } from "@/lib/health";
import { StatusBadge, HealthDot, StageLabel, PIPELINE_STAGES, fmtDate } from "./_components/badges";
import ClientClock from "./_components/client-clock";

function rateOf(
  billingRates: { type?: string; rate: unknown; hoursPerWeek?: unknown }[],
): string {
  const b = billingRates[0];
  if (!b) return "—";
  if (b.type === "FIXED") {
    const parts: string[] = [];
    if (b.rate != null) parts.push(`$${String(b.rate)}`);
    if (b.hoursPerWeek != null) parts.push(`${String(b.hoursPerWeek)} hrs/wk`);
    return parts.join(" · ") || "Fixed";
  }
  return b.rate != null ? `$${String(b.rate)}/hr` : "—";
}

type ClientRow = Awaited<ReturnType<typeof listClients>>[number];

function ClientsTable({
  clients,
  healthMap,
}: {
  clients: ClientRow[];
  healthMap?: Map<string, ComputedHealth>;
}) {
  return (
    <>
      {/* Phones: one card per client */}
      <ul className="flex flex-col gap-2.5 lg:hidden">
        {clients.map((c) => {
          const health = healthMap?.get(c.id);
          return (
            <li key={c.id}>
              <Link
                href={`/crm/${c.id}`}
                className="flex flex-col gap-2.5 rounded-[22px] border border-black/[0.07] bg-white p-4"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] font-display text-lg text-white"
                    style={{ background: c.colorHex ?? "#1E1E2E" }}
                  >
                    {c.companyName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">{c.companyName}</span>
                    <span className="block truncate text-[13px] text-[#6B645D]">
                      {[c.serviceType, c.contacts[0]?.name].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  <StatusBadge status={c.status} />
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#4F4943]">
                  {health && (
                    <HealthDot health={health.health} reasons={health.reasons} isOverride={health.isOverride} />
                  )}
                  <span>{rateOf(c.billingRates)}</span>
                  <span>
                    {c._count.projects} project{c._count.projects === 1 ? "" : "s"}
                  </span>
                  {c.timezone && <ClientClock timezone={c.timezone} />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

    <div className="hidden lg:block bg-white rounded-[22px] border border-black/[0.07] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink/45 border-b border-black/[0.07]">
              <th className="px-5 py-3">Company</th>
              <th className="px-5 py-3">Status</th>
              {healthMap && <th className="px-5 py-3">Health</th>}
              <th className="px-5 py-3">Service</th>
              <th className="px-5 py-3">Primary Contact</th>
              <th className="px-5 py-3">Rate</th>
              <th className="px-5 py-3">Local Time</th>
              <th className="px-5 py-3">Projects</th>
              <th className="px-5 py-3">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const health = healthMap?.get(c.id);
              return (
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
                  {healthMap && (
                    <td className="px-5 py-3">
                      {health ? (
                        <HealthDot health={health.health} reasons={health.reasons} isOverride={health.isOverride} />
                      ) : (
                        <span className="text-black/25">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3 text-black/60">{c.serviceType ?? "—"}</td>
                  <td className="px-5 py-3 text-black/60">{c.contacts[0]?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-black/60">{rateOf(c.billingRates)}</td>
                  <td className="px-5 py-3 text-sm">
                    <ClientClock timezone={c.timezone} />
                  </td>
                  <td className="px-5 py-3 text-black/60">{c._count.projects}</td>
                  <td className="px-5 py-3 text-black/60">{fmtDate(c.renewalDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const view = tab === "leads" ? "leads" : tab === "churned" ? "churned" : "clients";

  const [clients, leads, churned, healthMap] = await Promise.all([
    listClients(),
    listLeads(),
    listChurnedClients(),
    computeClientHealthMap(),
  ]);

  const tabCls = (active: boolean) =>
    `flex h-[38px] items-center justify-center px-3 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
      active ? "bg-midnight text-white" : "text-[#4F4943] hover:bg-cream"
    }`;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-2xl bg-white border border-black/[0.07] p-1 lg:inline-flex lg:flex-none">
          <Link href="/crm" className={tabCls(view === "clients")}>
            Clients ({clients.length})
          </Link>
          <Link href="/crm?tab=leads" className={tabCls(view === "leads")}>
            Leads ({leads.length})
          </Link>
          <Link href="/crm?tab=churned" className={tabCls(view === "churned")}>
            Churned ({churned.length})
          </Link>
        </div>
        <Link
          href="/crm/new"
          aria-label="New client or lead"
          className="inline-flex h-11 shrink-0 items-center gap-2 bg-brand hover:bg-brand-hover text-ink font-bold text-sm px-4 rounded-[14px] transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.6} />
          New
        </Link>
      </div>

      {view === "leads" ? (
        /* ── LEADS PIPELINE ── */
        leads.length === 0 ? (
          <EmptyState label="No leads yet. Add one to start tracking your pipeline." />
        ) : (
          // Phones: swipe sideways through the stages; desktop: all six columns.
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-5 sm:scroll-px-5 sm:px-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0 xl:grid-cols-6 [scrollbar-width:none]">
            {PIPELINE_STAGES.map((stage) => {
              const col = leads.filter((l) => l.pipelineStage === stage);
              return (
                <div
                  key={stage}
                  className="w-[78%] shrink-0 snap-start rounded-[22px] bg-[#EFE9E2] p-3 lg:w-auto"
                >
                  <div className="mb-3 flex items-center justify-between px-1.5">
                    <span className="text-sm font-bold text-ink">
                      <StageLabel stage={stage} />
                    </span>
                    <span className="text-[13px] font-semibold text-[#6B645D]">{col.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/crm/${lead.id}`}
                        className="block rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(26,26,26,0.06)] transition hover:ring-1 hover:ring-brand/40"
                      >
                        <p className="text-[15px] font-bold leading-tight text-ink">{lead.companyName}</p>
                        {lead.serviceType && <p className="mt-0.5 text-xs text-[#6B645D]">{lead.serviceType}</p>}
                        {lead.contacts[0] && <p className="mt-2 text-xs text-[#6B645D]">{lead.contacts[0].name}</p>}
                      </Link>
                    ))}
                    {col.length === 0 && <p className="px-1.5 py-2 text-xs text-[#8A827A]">No leads</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : view === "churned" ? (
        /* ── CHURNED CLIENTS ── */
        churned.length === 0 ? (
          <EmptyState label="No churned clients. Former clients you mark as churned move here." />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-black/45">
              Former clients, kept for the record. Open one and set its status back to Active to
              bring it (and its projects) back.
            </p>
            <ClientsTable clients={churned} />
          </div>
        )
      ) : /* ── CLIENTS TABLE ── */ clients.length === 0 ? (
        <EmptyState label="No clients yet. Add your first client to get started." />
      ) : (
        <ClientsTable clients={clients} healthMap={healthMap} />
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white border border-dashed border-black/15 rounded-[22px] p-10 lg:p-14 text-center">
      <div className="w-12 h-12 rounded-2xl bg-brand-pale text-[#B34100] flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-6 h-6" />
      </div>
      <p className="text-[#6B645D]">{label}</p>
    </div>
  );
}
