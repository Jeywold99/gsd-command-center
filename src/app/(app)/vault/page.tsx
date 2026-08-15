import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { listDocuments, listCategories } from "@/lib/vault";
import { uploadDocument } from "./actions";
import DocGrid from "./_components/doc-grid";

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

      {/* Card grid + inline preview */}
      {docs.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-black/50">No documents yet. Upload SOPs, contracts, or assets above.</p>
        </div>
      ) : (
        <DocGrid docs={docs} />
      )}
    </div>
  );
}
