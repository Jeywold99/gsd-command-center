"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadPortalDocument, savePortalLogin, type VaultFormState } from "./actions";

type Biz = { id: string; name: string };

export function UploadForm({ businesses, defaultBiz }: { businesses: Biz[]; defaultBiz?: string }) {
  const [state, action, pending] = useActionState<VaultFormState, FormData>(uploadPortalDocument, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="p-label">File (up to 50 MB)</span>
        <input type="file" name="file" required className="p-input py-2" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Business</span>
        <select name="projectId" className="p-select" defaultValue={defaultBiz ?? ""} required>
          <option value="">Choose…</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Folder (optional)</span>
        <input name="category" className="p-input" placeholder="Research, Board, Insurance…" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Expires (optional)</span>
        <input type="date" name="expiresAt" className="p-input" />
      </label>
      {state?.error && <p className="p-error sm:col-span-2">{state.error}</p>}
      {state?.ok && <p className="text-[13px] text-[#065F46] sm:col-span-2">{state.ok}</p>}
      <div className="sm:col-span-2 flex justify-end">
        <button className="p-btn p-btn-primary" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}

export type LoginValues = {
  id?: string;
  service: string;
  sharedWith: string;
  projectId: string;
  twoFactor: boolean;
  url: string;
  lastChangedAt: string;
};

export function LoginDetailsForm({ businesses, values }: { businesses: Biz[]; values: LoginValues }) {
  const [state, action, pending] = useActionState<VaultFormState, FormData>(savePortalLogin, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Service</span>
        <input name="service" className="p-input" defaultValue={values.service} placeholder="LinkedIn company page admin" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Business</span>
        <select name="projectId" className="p-select" defaultValue={values.projectId}>
          <option value="">Personal / all</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Shared with</span>
        <input name="sharedWith" className="p-input" defaultValue={values.sharedWith} placeholder="Nathan, Jana" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Password last changed</span>
        <input type="date" name="lastChangedAt" className="p-input" defaultValue={values.lastChangedAt} />
      </label>
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="p-label">Link to the item in your password manager (optional)</span>
        <input name="url" className="p-input" defaultValue={values.url} placeholder="https://vault.bitwarden.com/#/vault?itemId=…" />
      </label>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="twoFactor" defaultChecked={values.twoFactor} />
        <span>Two-step verification is on for this login</span>
      </label>
      <p className="text-[12px] p-faint sm:col-span-2">Never type the password here. It stays in the password manager.</p>
      {state?.error && <p className="p-error sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2 flex justify-end">
        <button className="p-btn p-btn-primary" disabled={pending}>
          {pending ? "Saving…" : values.id ? "Save" : "Add login"}
        </button>
      </div>
    </form>
  );
}
