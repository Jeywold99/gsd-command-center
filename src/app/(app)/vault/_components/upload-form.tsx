"use client";

import { Upload } from "lucide-react";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

type ClientOpt = { id: string; companyName: string };

export default function UploadForm({
  action,
  categories,
  clients,
  defaultClientId,
  onDone,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: string[];
  clients: ClientOpt[];
  defaultClientId?: string;
  onDone?: () => void;
}) {
  return (
    <form action={action} onSubmit={onDone} className="space-y-3">
      <div>
        <label className={label}>File *</label>
        <input
          type="file"
          name="file"
          required
          className={`${input} file:mr-3 file:rounded file:border-0 file:bg-brand file:text-white file:px-3 file:py-1 file:text-xs file:font-bold`}
        />
      </div>

      <div>
        <label className={label}>Category</label>
        <input name="category" list="vault-cats" placeholder="e.g. SOP" className={input} />
        <datalist id="vault-cats">
          {[...new Set(["SOP", "Contract", "Asset", "Brand", "Other", ...categories])].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div>
        <label className={label}>Client</label>
        <select name="clientId" defaultValue={defaultClientId ?? ""} className={input}>
          <option value="">— None (Internal) —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.companyName}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-5 py-2 rounded-full transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-xs font-semibold text-ink/50 hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
