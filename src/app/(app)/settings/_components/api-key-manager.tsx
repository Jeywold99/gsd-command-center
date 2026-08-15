"use client";

import { useState } from "react";
import { Key, Trash2 } from "lucide-react";
import { createApiKey, revokeApiKey } from "../actions";

type Row = { id: string; name: string; lastUsedAt: string | Date | null; createdAt: string | Date };

export default function ApiKeyManager({ initial }: { initial: Row[] }) {
  const [keys, setKeys] = useState<Row[]>(initial);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await createApiKey(name || "n8n key");
    setBusy(false);
    if (res) {
      setKeys((prev) => [
        { id: res.id, name: res.name, lastUsedAt: null, createdAt: new Date() },
        ...prev,
      ]);
      setCreated(res.raw);
      setName("");
    }
  };

  const revoke = async (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    await revokeApiKey(id);
  };

  return (
    <div className="space-y-4">
      {created && (
        <div className="bg-brand-pale border border-brand/30 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand mb-1">
            Copy this key now — it won&apos;t be shown again
          </p>
          <code className="block bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink break-all select-all">
            {created}
          </code>
          <button
            onClick={() => setCreated(null)}
            className="mt-2 text-xs font-semibold text-ink/50 hover:text-ink"
          >
            Done
          </button>
        </div>
      )}

      <form onSubmit={create} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5">
            Key name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="n8n production"
            className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-bold uppercase tracking-wide text-sm px-4 py-2 rounded-full transition-colors"
        >
          <Key className="w-4 h-4" />
          {busy ? "Generating…" : "Generate Key"}
        </button>
      </form>

      {keys.length === 0 ? (
        <p className="text-sm text-black/40">No API keys yet.</p>
      ) : (
        <ul className="divide-y divide-black/[0.06]">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-semibold text-ink">{k.name}</p>
                <p className="text-xs text-black/40">
                  {k.lastUsedAt
                    ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : "Never used"}
                </p>
              </div>
              <button
                onClick={() => revoke(k.id)}
                className="p-1.5 rounded-lg text-ink/40 hover:text-red-600 hover:bg-red-50 transition"
                title="Revoke"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
