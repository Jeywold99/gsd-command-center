import Link from "next/link";
import { Upload, FileText, Archive, ArrowLeft } from "lucide-react";
import { listClientsWithDocuments, listChurnedClientDocuments, listCategories } from "@/lib/vault";
import { listActiveClients } from "@/lib/projects";
import { uploadDocument } from "./actions";
import UploadForm from "./_components/upload-form";
import DocGrid from "./_components/doc-grid";
import ClientDirectory from "./_components/client-directory";
import AddModal from "../_components/add-modal";

export default async function VaultPage({
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
            href="/vault"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to clients
          </Link>
        ) : (
          <Link
            href="/vault?show=churned"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/40 hover:text-ink"
          >
            <Archive className="w-3.5 h-3.5" />
            Churned clients
          </Link>
        )}

        {!showChurned && <UploadTrigger />}
      </div>

      {showChurned ? <ChurnedView /> : <Directory />}
    </div>
  );
}

async function UploadTrigger() {
  const [categories, clients] = await Promise.all([listCategories(), listActiveClients()]);
  return (
    <AddModal
      title="Upload Document"
      triggerClassName="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm"
      trigger={
        <>
          <Upload className="w-4 h-4" /> Upload
        </>
      }
    >
      <UploadForm action={uploadDocument} categories={categories} clients={clients} />
    </AddModal>
  );
}

// ── Default landing view: pick a client, see just their documents ──────────
async function Directory() {
  const clients = await listClientsWithDocuments();

  if (clients.length === 0) {
    return (
      <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-black/50">No documents yet. Upload SOPs, contracts, or assets above.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-black/45 mb-4">Pick a client to see just their documents.</p>
      <ClientDirectory clients={clients} />
    </div>
  );
}

// ── "Churned clients" — a flat cross-client list, grouped by client. Low
// traffic maintenance view, so unlike the default landing page it stays a
// single flat list rather than its own per-client drill-down. ──────────────
async function ChurnedView() {
  const docs = await listChurnedClientDocuments();

  type DocRow = (typeof docs)[number];
  const byClient = new Map<string, { id: string; name: string; docs: DocRow[] }>();
  for (const d of docs) {
    // listChurnedClientDocuments only returns docs with a churned client, so
    // `client` and `clientId` are always set here.
    const key = d.clientId!;
    if (!byClient.has(key)) {
      byClient.set(key, { id: key, name: d.client!.companyName, docs: [] });
    }
    byClient.get(key)!.docs.push(d);
  }
  const groups = [...byClient.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl tracking-wide text-ink">Churned clients&apos; documents</h2>

      {groups.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-black/50">No churned clients with stored documents.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Link href={`/crm/${g.id}`} className="group/client">
                <h3 className="font-display text-2xl tracking-wide text-ink group-hover/client:text-brand transition-colors">
                  {g.name}
                </h3>
              </Link>
              <span className="text-[10px] font-bold uppercase tracking-wide text-black/50 bg-black/5 border border-black/15 rounded px-1.5 py-0.5">
                Churned
              </span>
              <span className="text-xs font-semibold text-black/35">
                {g.docs.length} document{g.docs.length === 1 ? "" : "s"}
              </span>
            </div>
            <DocGrid docs={g.docs} />
          </section>
        ))
      )}
    </div>
  );
}
