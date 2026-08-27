"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { revealPassword, updateCredential, deleteCredential } from "../actions";
import CredentialForm from "./credential-form";

type ClientOpt = { id: string; companyName: string };

type Credential = {
  id: string;
  label: string;
  scope: string;
  category: string | null;
  username: string | null;
  url: string | null;
  notes: string | null;
  clientId: string | null;
  client: { id: string; companyName: string; colorHex: string | null } | null;
  createdBy: { name: string };
  updatedAt: Date | string;
};

export default function CredentialCard({
  cred,
  clients,
}: {
  cred: Credential;
  clients: ClientOpt[];
}) {
  const [editing, setEditing] = useState(false);
  const [pw, setPw] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);

  async function toggleReveal() {
    if (pw !== null) {
      setPw(null);
      return;
    }
    setBusy(true);
    try {
      setPw(await revealPassword(cred.id));
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, which: "user" | "pass") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  async function copyPassword() {
    const value = pw ?? (await revealPassword(cred.id));
    await copyText(value, "pass");
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-brand/30 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand mb-3">
          Edit credential
        </p>
        <CredentialForm
          action={updateCredential}
          mode="edit"
          clients={clients}
          defaults={{
            id: cred.id,
            label: cred.label,
            scope: cred.scope,
            category: cred.category ?? "",
            username: cred.username ?? "",
            url: cred.url ?? "",
            notes: cred.notes ?? "",
            clientId: cred.clientId ?? "",
          }}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-ink leading-snug truncate">{cred.label}</h3>
          {cred.category && (
            <div className="mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-brand bg-brand-pale px-1.5 py-0.5 rounded">
                {cred.category}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-ink/40 hover:text-brand hover:bg-brand-pale transition"
            title="Edit"
            aria-label="Edit credential"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <form action={deleteCredential}>
            <input type="hidden" name="id" value={cred.id} />
            <button
              type="submit"
              className="p-1.5 rounded-lg text-ink/40 hover:text-red-600 hover:bg-red-50 transition"
              title="Delete"
              aria-label="Delete credential"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Username */}
      {cred.username && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40 w-16 shrink-0">
            User
          </span>
          <span className="font-mono text-ink truncate flex-1 min-w-0">{cred.username}</span>
          <button
            type="button"
            onClick={() => copyText(cred.username!, "user")}
            className="p-1 rounded text-ink/40 hover:text-ink hover:bg-black/[0.04]"
            title="Copy username"
          >
            {copied === "user" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Password */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40 w-16 shrink-0">
          Pass
        </span>
        <span className="font-mono text-ink truncate flex-1 min-w-0">
          {busy ? "…" : pw !== null ? pw : "••••••••••"}
        </span>
        <button
          type="button"
          onClick={toggleReveal}
          className="p-1 rounded text-ink/40 hover:text-ink hover:bg-black/[0.04]"
          title={pw !== null ? "Hide" : "Reveal"}
        >
          {pw !== null ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={copyPassword}
          className="p-1 rounded text-ink/40 hover:text-ink hover:bg-black/[0.04]"
          title="Copy password"
        >
          {copied === "pass" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* URL + notes */}
      {cred.url && (
        <a
          href={cred.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline w-fit"
        >
          Open site <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {cred.notes && (
        <p className="text-xs text-black/50 whitespace-pre-wrap border-t border-black/[0.06] pt-2">
          {cred.notes}
        </p>
      )}
    </div>
  );
}
