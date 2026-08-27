"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

type ClientOpt = { id: string; companyName: string };

type Defaults = {
  id?: string;
  label?: string;
  scope?: string;
  category?: string;
  username?: string;
  url?: string;
  notes?: string;
  clientId?: string;
};

export default function CredentialForm({
  action,
  mode,
  clients,
  defaults = {},
  onDone,
}: {
  action: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  clients: ClientOpt[];
  defaults?: Defaults;
  onDone?: () => void;
}) {
  const [scope, setScope] = useState(defaults.scope === "CLIENT" ? "CLIENT" : "INTERNAL");
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={action} onSubmit={onDone} className="space-y-3">
      {mode === "edit" && <input type="hidden" name="id" value={defaults.id} />}

      <div>
        <label className={label}>Label *</label>
        <input
          name="label"
          required
          defaultValue={defaults.label}
          placeholder="e.g. Acme — Google Workspace"
          className={input}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Type</label>
          <select
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className={input}
          >
            <option value="INTERNAL">Internal</option>
            <option value="CLIENT">Client</option>
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <input
            name="category"
            defaultValue={defaults.category}
            placeholder="Email, Hosting…"
            className={input}
          />
        </div>
      </div>

      {scope === "CLIENT" && (
        <div>
          <label className={label}>Client *</label>
          <select name="clientId" required defaultValue={defaults.clientId ?? ""} className={input}>
            <option value="">— select client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>Username / email</label>
        <input
          name="username"
          defaultValue={defaults.username}
          autoComplete="off"
          placeholder="login@…"
          className={input}
        />
      </div>

      <div>
        <label className={label}>
          Password {mode === "edit" ? "(leave blank to keep)" : "*"}
        </label>
        <div className="relative">
          <input
            name="password"
            type={showPw ? "text" : "password"}
            required={mode === "create"}
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${input} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
            aria-label={showPw ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className={label}>URL</label>
        <input
          name="url"
          type="url"
          defaultValue={defaults.url}
          placeholder="https://…"
          className={input}
        />
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaults.notes}
          placeholder="Recovery info, 2FA location, who owns it…"
          className={input}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-5 py-2 rounded-full transition-colors"
        >
          {mode === "create" ? "Save credential" : "Save changes"}
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
