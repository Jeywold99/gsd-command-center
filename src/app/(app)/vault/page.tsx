import Link from "next/link";
import { FileText, Download, Trash2, Upload } from "lucide-react";
import { listDocuments, listCategories } from "@/lib/vault";
import { fmtDate } from "@/lib/format";
import { uploadDocument, deleteDocument } from "./actions";

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [docs, categories] = await Promise.all([listDocuments(category), listCategories()]);

  const tabCls = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      {/* Upload */}
      <form
        action={uploadDocument}
        className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5">
            File
          </label>
          <input type="file" name="file" required className={`${input} file:mr-3 file:rounded file:border-0 file:bg-brand file:text-white file:px-3 file:py-1 file:text-xs file:font-bold`} />
        </div>
        <div className="w-48">
          <label className="block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5">
            Category
          </label>
          <input name="category" list="cats" placeholder="e.g. SOP" className={input} />
          <datalist id="cats">
            {[...new Set(["SOP", "Contract", "Asset", "Brand", "Other", ...categories])].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2 rounded-full transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </form>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="inline-flex flex-wrap rounded-full bg-cream border border-black/10 p-1 gap-0.5">
          <Link href="/vault" className={tabCls(!category)}>
            All
          </Link>
          {categories.map((c) => (
            <Link key={c} href={`/vault?category=${encodeURIComponent(c)}`} className={tabCls(category === c)}>
              {c}
            </Link>
          ))}
        </div>
      )}

      {/* List */}
      {docs.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-black/50">No documents yet. Upload SOPs, contracts, or assets above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink/45 border-b border-black/[0.07]">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Linked</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Uploaded</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-black/[0.05] last:border-0 hover:bg-cream/60 transition">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 font-semibold text-ink">
                        <FileText className="w-4 h-4 text-black/30 shrink-0" />
                        {doc.name}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {doc.category ? (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-brand bg-brand-pale px-2 py-0.5 rounded-full">
                          {doc.category}
                        </span>
                      ) : (
                        <span className="text-black/30">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-black/55">
                      {doc.project?.name ?? doc.client?.companyName ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-black/55">{fmtBytes(doc.sizeBytes)}</td>
                    <td className="px-5 py-3 text-black/55">
                      {doc.uploadedBy.name} · {fmtDate(doc.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/files/${doc.id}`}
                          className="p-1.5 rounded-lg text-ink/50 hover:text-brand hover:bg-brand-pale/50 transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <form action={deleteDocument}>
                          <input type="hidden" name="id" value={doc.id} />
                          <button
                            type="submit"
                            className="p-1.5 rounded-lg text-ink/40 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </td>
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
