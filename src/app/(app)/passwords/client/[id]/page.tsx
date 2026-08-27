import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, KeyRound, Building2, ExternalLink } from "lucide-react";
import { listCredentialsForClient } from "@/lib/passwords";
import { getClientLite, listActiveClients } from "@/lib/projects";
import { createCredential } from "../../actions";
import CredentialForm from "../../_components/credential-form";
import CredentialCard from "../../_components/credential-card";
import AddModal from "../../../_components/add-modal";

export default async function ClientPasswordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isInternal = id === "internal";

  const [client, creds, clients] = await Promise.all([
    isInternal ? Promise.resolve(null) : getClientLite(id),
    listCredentialsForClient(isInternal ? null : id),
    listActiveClients(),
  ]);

  // A real (non-internal) id that doesn't resolve to an active client — wrong
  // id, or the client has since churned (churned = hidden, same as elsewhere;
  // their passwords are still reachable from the "Churned clients" view).
  if (!isInternal && !client) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/passwords"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        All clients
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {client ? (
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: client.colorHex ?? "#cbd5e1" }} />
              ) : (
                <Building2 className="w-6 h-6 text-black/35" />
              )}
              <h2 className="font-display text-4xl tracking-wide text-ink leading-none">
                {client ? client.companyName : "Internal"}
              </h2>
            </div>
            <p className="mt-3 text-sm text-black/55">
              {creds.length} password{creds.length === 1 ? "" : "s"}
            </p>
          </div>

          {client && (
            <Link
              href={`/crm/${client.id}`}
              className="inline-flex items-center gap-1.5 border border-black/10 text-ink/70 hover:text-ink hover:bg-cream text-sm font-semibold px-3.5 py-2 rounded-full transition"
            >
              View in CRM
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <AddModal
          title="New Password"
          triggerClassName="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm"
          trigger={
            <>
              <Plus className="w-4 h-4" />
              New Password{client ? ` for ${client.companyName}` : ""}
            </>
          }
        >
          <CredentialForm
            action={createCredential}
            mode="create"
            clients={clients}
            defaults={client ? { scope: "CLIENT", clientId: client.id } : { scope: "INTERNAL" }}
          />
        </AddModal>
      </div>

      {creds.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="text-black/50">
            No passwords yet{client ? ` for ${client.companyName}` : ""}. Add the first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {creds.map((cred) => (
            <CredentialCard key={cred.id} cred={cred} clients={clients} />
          ))}
        </div>
      )}
    </div>
  );
}
