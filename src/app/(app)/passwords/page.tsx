import Link from "next/link";
import { Plus, KeyRound, ShieldCheck } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { listCredentials } from "@/lib/passwords";
import { listActiveClients } from "@/lib/projects";
import { createCredential } from "./actions";
import CredentialForm from "./_components/credential-form";
import CredentialCard from "./_components/credential-card";
import AddModal from "../_components/add-modal";

export default async function PasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  await verifySession();
  const { scope } = await searchParams;
  const view = scope === "internal" ? "internal" : scope === "client" ? "client" : "all";

  const [all, clients] = await Promise.all([listCredentials(), listActiveClients()]);
  const internal = all.filter((c) => c.scope === "INTERNAL");
  const clientCreds = all.filter((c) => c.scope === "CLIENT");
  const shown = view === "internal" ? internal : view === "client" ? clientCreds : all;

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-bold transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full bg-cream border border-black/10 p-1">
          <Link href="/passwords" className={tabCls(view === "all")}>
            All ({all.length})
          </Link>
          <Link href="/passwords?scope=internal" className={tabCls(view === "internal")}>
            Internal ({internal.length})
          </Link>
          <Link href="/passwords?scope=client" className={tabCls(view === "client")}>
            Client ({clientCreds.length})
          </Link>
        </div>

        <AddModal
          title="New Password"
          triggerClassName="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm"
          trigger={
            <>
              <Plus className="w-4 h-4" /> New Password
            </>
          }
        >
          <CredentialForm action={createCredential} mode="create" clients={clients} />
        </AddModal>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 rounded-xl bg-cream/60 border border-black/[0.06] px-4 py-2.5 text-xs text-black/55">
        <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
        Passwords are encrypted at rest and only decrypted when you click reveal or copy. Shared
        across the team — anyone signed in can view them.
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="text-black/50">
            {view === "all"
              ? "No stored passwords yet. Add your first with “New Password”."
              : `No ${view} passwords yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {shown.map((cred) => (
            <CredentialCard key={cred.id} cred={cred} clients={clients} />
          ))}
        </div>
      )}
    </div>
  );
}
