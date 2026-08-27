import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Upload, FileText, Building2, ExternalLink } from "lucide-react";
import { listDocumentsForClient, listCategories } from "@/lib/vault";
import { getClientLite, listActiveClients } from "@/lib/projects";
import { uploadDocument } from "../../actions";
import UploadForm from "../../_components/upload-form";
import DocGrid from "../../_components/doc-grid";
import AddModal from "../../../_components/add-modal";

export default async function ClientVaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const { category } = await searchParams;
  const isInternal = id === "internal";
  const clientId = isInternal ? null : id;

  const [client, docs, categories, allCategories, clients] = await Promise.all([
    isInternal ? Promise.resolve(null) : getClientLite(id),
    listDocumentsForClient(clientId, category),
    listCategories(clientId),
    listCategories(),
    listActiveClients(),
  ]);

  // A real (non-internal) id that doesn't resolve to an active client — wrong
  // id, or the client has since churned (churned = hidden, same as elsewhere;
  // their documents are still reachable from the "Churned clients" view).
  if (!isInternal && !client) notFound();

  const hrefWith = (cat?: string) => {
    const qs = cat ? `?category=${encodeURIComponent(cat)}` : "";
    return `/vault/client/${id}${qs}`;
  };
  const tabCls = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      <Link
        href="/vault"
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
              {docs.length} document{docs.length === 1 ? "" : "s"}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        {categories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            <Link href={hrefWith()} className={tabCls(!category)}>
              All
            </Link>
            {categories.map((c) => (
              <Link key={c} href={hrefWith(c)} className={tabCls(category === c)}>
                {c}
              </Link>
            ))}
          </div>
        ) : (
          <span />
        )}

        <AddModal
          title="Upload Document"
          triggerClassName="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm"
          trigger={
            <>
              <Upload className="w-4 h-4" />
              Upload{client ? ` for ${client.companyName}` : ""}
            </>
          }
        >
          <UploadForm
            action={uploadDocument}
            categories={allCategories}
            clients={clients}
            defaultClientId={client?.id}
          />
        </AddModal>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-black/50">
            {category
              ? "No documents match this filter."
              : `No documents yet${client ? ` for ${client.companyName}` : ""}. Upload the first one.`}
          </p>
        </div>
      ) : (
        <DocGrid docs={docs} />
      )}
    </div>
  );
}
