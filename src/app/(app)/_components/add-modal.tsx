"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

// Centered full-view modal for "Add X" forms — replaces the old <details>
// corner dropdown, which anchored to its trigger button and had to stay small
// to avoid clipping off-screen. This has the whole viewport to work with.
//
// Closes on: the backdrop, the X button, Escape, or submitting a form inside.
//
// The submit-close MUST be a bubble-phase onSubmit, not onSubmitCapture. A
// capture-phase handler on an ancestor fires before the form's own submit
// handling reaches the target — which is where React's action dispatch for
// `<form action={serverAction}>` actually lives. Closing (and unmounting the
// form) there pre-empts the dispatch entirely: no request is ever sent, and
// for an action that calls `redirect()` (e.g. createChannel, quickAddTask)
// the whole operation silently does nothing. Confirmed via a live repro:
// onSubmitCapture -> zero network requests fired; onSubmit -> the action's
// POST fires and its redirect completes normally.
export default function AddModal({
  trigger,
  triggerClassName,
  title,
  panelClassName,
  children,
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  title: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full rounded-2xl bg-white shadow-2xl ${panelClassName ?? "max-w-lg"}`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={() => setOpen(false)}
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.07] px-6 py-4">
              <h2 className="font-display text-2xl tracking-wide text-ink">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-black/[0.04] shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
