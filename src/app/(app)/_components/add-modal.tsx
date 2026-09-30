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
  triggerAriaLabel,
  title,
  panelClassName,
  defaultOpen = false,
  children,
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  // Needed when `trigger` has no text content (e.g. an invisible full-cell
  // click target) — otherwise the button announces to screen readers as
  // unlabeled.
  triggerAriaLabel?: string;
  title: string;
  panelClassName?: string;
  // Open on first render (e.g. arriving from the Create sheet with ?new=1).
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        aria-label={triggerAriaLabel}
      >
        {trigger}
      </button>

      {open && (
        // Phones: a bottom sheet (scrolls inside, clears the home indicator).
        // sm+: a centered panel that scrolls with the page.
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(20,20,30,0.55)] animate-[fade-in_150ms_ease-out] sm:items-start sm:overflow-y-auto sm:p-8"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className={`flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-white shadow-2xl animate-[sheet-up_220ms_cubic-bezier(0.2,0.8,0.2,1)] sm:max-h-none sm:rounded-[24px] ${panelClassName ?? "max-w-lg"}`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={() => setOpen(false)}
          >
            <div className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-[#D9D2CA] sm:hidden" />
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3 pb-3 sm:px-6 sm:pt-5">
              <h2 className="text-xl font-bold text-ink">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F1ECE6] text-ink"
                aria-label="Close"
              >
                <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:overflow-visible sm:px-6 sm:pb-6">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
