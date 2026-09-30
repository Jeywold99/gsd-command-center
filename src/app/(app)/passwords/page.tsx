import Link from "next/link";
import { Plus, KeyRound, ShieldCheck, Archive, ArrowLeft } from "lucide-react";
import { listClientsWithCredentials, listChurnedClientCredentials } from "@/lib/passwords";
import { listActiveClients } from "@/lib/projects";
import { createCredential } from "./actions";
import CredentialForm from "./_components/credential-form";
import CredentialCard from "./_components/credential-card";
import ClientDirectory from "./_components/client-directory";
import AddModal from "../_components/add-modal";

export default async function PasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showChurned = show === "churned";

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {showChurned ? (
          <Link
            href="/passwords"
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[#B34100] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to clients
          </Link>
        ) : (
          <Link
            href="/passwords?show=churned"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/40 hover:text-ink"
          >
            <Archive className="w-3.5 h-3.5" />
            Churned clients
          </Link>
        )}

        {!showChurned && (
          <AddModalTrigger />
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 rounded-xl bg-cream/60 border border-black/[0.06] px-4 py-2.5 text-xs text-black/55">
        <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
        Passwords are encrypted at rest and only decrypted when you click reveal or copy. Shared
        across the team — anyone signed in can view them.
      </div>

      {showChurned ? <ChurnedView /> : <Directory />}
    </div>
  );
}

async function AddModalTrigger() {
  const clients = await listActiveClients();
  return (
    <AddModal
      title="New Password"
      triggerClassName="min-h-11 inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-ink font-bold text-sm px-4 py-2.5 rounded-[14px] transition-colors"
      trigger={
        <>
          <Plus className="w-4 h-4" /> New Password
        </>
      }
    >
      <CredentialForm action={createCredential} mode="create" clients={clients} />
    </AddModal>
  );
}

// ── Default landing view: pick a client, see just their passwords ──────────
async function Directory() {
  const clients = await listClientsWithCredentials();

  if (clients.length === 0) {
    return (
      <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <p className="text-black/50">No stored passwords yet. Add your first with “New Password”.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-black/45 mb-4">Pick a client to see just their passwords.</p>
      <ClientDirectory clients={clients} />
    </div>
  );
}

// ── "Churned clients" — a flat cross-client list, grouped by client. Low
// traffic maintenance view, so unlike the default landing page it stays a
// single flat list rather than its own per-client drill-down. ──────────────
async function ChurnedView() {
  const [creds, activeClients] = await Promise.all([
    listChurnedClientCredentials(),
    listActiveClients(),
  ]);

  // The edit form's client picker needs to include each churned client itself
  // (labeled clearly) so re-opening a card here can still show/save its
  // current client instead of silently falling back to no selection.
  const churnedClientOpts = [...new Map(
    creds.filter((c) => c.client).map((c) => [c.client!.id, { id: c.client!.id, companyName: `${c.client!.companyName} (Churned)` }]),
  ).values()];
  const clientOpts = [...activeClients, ...churnedClientOpts];

  const byClient = new Map<string, { id: string; name: string; color: string | null; creds: typeof creds }>();
  for (const c of creds) {
    if (!c.client) continue;
    const key = c.client.id;
    if (!byClient.has(key)) {
      byClient.set(key, { id: c.client.id, name: c.client.companyName, color: c.client.colorHex, creds: [] });
    }
    byClient.get(key)!.creds.push(c);
  }
  const groups = [...byClient.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <h2 className="text-[17px] font-bold text-ink">Churned clients&apos; passwords</h2>

      {groups.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="text-black/50">No churned clients with stored passwords.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Link href={`/crm/${g.id}`} className="flex items-center gap-2 group/client">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color ?? "#cbd5e1" }} />
                <h3 className="text-[17px] font-bold text-ink group-hover/client:text-brand transition-colors">
                  {g.name}
                </h3>
              </Link>
              <span className="text-[10px] font-bold uppercase tracking-wide text-black/50 bg-black/5 border border-black/15 rounded px-1.5 py-0.5">
                Churned
              </span>
              <span className="text-xs font-semibold text-black/35">
                {g.creds.length} password{g.creds.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {g.creds.map((cred) => (
                <CredentialCard key={cred.id} cred={cred} clients={clientOpts} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
