"use client";

import { useActionState, useState, useTransition } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { createAsset, deleteAsset, updateAsset } from "../assets-actions";
import { ASSET_LABEL, ASSET_TYPES, type AssetRow, type FormState } from "@/lib/pipeline/types";
import { FormNote, SubmitButton } from "./form-bits";
import { btnGhost, btnPrimary, card, input, label } from "./styles";

function AssetFields({ a }: { a?: AssetRow }) {
  const key = a?.id ?? "new";
  return (
    <>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <label className={label} htmlFor={`as-type-${key}`}>
            Kind
          </label>
          <select id={`as-type-${key}`} name="type" defaultValue={a?.type ?? "loom"} className={input}>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`as-title-${key}`}>
            Title
          </label>
          <input id={`as-title-${key}`} name="title" required defaultValue={a?.title ?? ""} maxLength={200} placeholder="e.g. GHL workflow walkthrough (3 min)" className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor={`as-url-${key}`}>
          Link
        </label>
        <input id={`as-url-${key}`} name="url" type="url" inputMode="url" defaultValue={a?.url ?? ""} placeholder="https://" maxLength={2000} className={input} />
      </div>
      <div>
        <label className={label} htmlFor={`as-notes-${key}`}>
          Notes (when to use it)
        </label>
        <textarea id={`as-notes-${key}`} name="notes" rows={2} defaultValue={a?.notes ?? ""} maxLength={2000} className={input} />
      </div>
    </>
  );
}

function AddAsset() {
  const [state, action] = useActionState<FormState, FormData>(createAsset, {});
  return (
    <details className="group rounded-[22px] border border-black/[0.07] bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 text-[15px] font-bold text-[#B34100] sm:px-5 [&::-webkit-details-marker]:hidden">
        <Plus className="h-4 w-4 transition group-open:rotate-45" aria-hidden /> Add an asset
      </summary>
      <form action={action} className="space-y-3 border-t border-black/[0.06] p-4 sm:p-5">
        <AssetFields />
        <FormNote state={state} />
        <SubmitButton className={btnPrimary} pendingLabel="Adding…">
          Add asset
        </SubmitButton>
      </form>
    </details>
  );
}

function AssetItem({ a }: { a: AssetRow }) {
  const [state, action] = useActionState<FormState, FormData>(updateAsset, {});
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startDelete] = useTransition();

  function remove() {
    setError(null);
    startDelete(async () => {
      const res = await deleteAsset(a.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-brand-pale px-2.5 py-0.5 text-[11px] font-bold text-[#B34100]">{ASSET_LABEL[a.type]}</span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-bold leading-snug text-ink">{a.title}</p>
          {a.notes && <p className="mt-0.5 whitespace-pre-line text-[13px] text-[#6B645D]">{a.notes}</p>}
          {a.url && (
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-[#B34100] hover:underline">
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{a.url}</span>
            </a>
          )}
        </div>
      </div>
      <details className="mt-1 pl-1">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-xs font-bold text-[#B34100] hover:underline [&::-webkit-details-marker]:hidden">
          Edit or delete
        </summary>
        <form action={action} className="mt-2 space-y-3 rounded-[16px] bg-cream p-3.5">
          <AssetFields a={a} />
          <FormNote state={state} />
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton className={btnGhost} pendingLabel="Saving…">
              Save
            </SubmitButton>
            {!confirming ? (
              <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-red-700 hover:underline">
                Delete
              </button>
            ) : (
              <>
                <button type="button" onClick={remove} disabled={pending} className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-5 text-sm font-bold text-white disabled:opacity-50">
                  Yes, delete it
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-ink/70">
                  Keep it
                </button>
              </>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </form>
      </details>
    </li>
  );
}

export function AssetsManager({ assets }: { assets: AssetRow[] }) {
  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="assets-h">
        <h2 id="assets-h" className="font-display text-[28px] leading-none tracking-[0.01em]">
          Your assets
        </h2>
        <p className="mt-1.5 text-sm text-[#6B645D]">
          The Looms, resume versions, portfolio pages and case studies you reuse. On an application, attach one to a requirement
          and it is marked done with the link filled in.
        </p>
        {assets.length === 0 ? (
          <p className="mt-4 rounded-[14px] border border-dashed border-black/15 p-5 text-center text-sm text-[#6B645D]">No assets yet. Add your first one below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/[0.06]">
            {assets.map((a) => (
              <AssetItem key={a.id} a={a} />
            ))}
          </ul>
        )}
      </section>
      <AddAsset />
    </div>
  );
}
