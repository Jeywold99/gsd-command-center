"use client";

import { useState, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";

// Small centered confirmation overlay for destructive actions that need a
// "are you sure" step (unlike most deletes in this app — task/milestone/
// contact/credential rows delete on a single click with no confirmation).
//
// The submit-close is bubble-phase `onSubmit`, not `onSubmitCapture` — see
// add-modal.tsx for why: capture-phase on an ancestor fires before the
// form's own action dispatch and silently drops the submission.
export default function ConfirmDelete({
  action,
  fields,
  title,
  description,
  triggerClassName,
  triggerTitle,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  title: string;
  description?: ReactNode;
  triggerClassName?: string;
  triggerTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        title={triggerTitle}
        aria-label={triggerTitle}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-display text-xl tracking-wide text-ink">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-black/[0.04] shrink-0"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {description && <p className="text-sm text-black/55 mb-5">{description}</p>}
            <div className="flex items-center gap-2">
              <form action={action} onSubmit={() => setOpen(false)} className="flex-1">
                {Object.entries(fields).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wide py-2.5 rounded-full transition-colors"
                >
                  Delete
                </button>
              </form>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
