"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ListChecks,
  CalendarDays,
  BellRing,
  Lightbulb,
  Timer,
  Building2,
  X,
  type LucideIcon,
} from "lucide-react";

// The tab bar's "+" — a bottom sheet (phones) / centered panel (larger screens)
// with one tap to every "create" flow in the app.

const ACTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/tasks?new=1", label: "Task", icon: ListChecks },
  { href: "/calendar?new=1", label: "Event", icon: CalendarDays },
  { href: "/tasks?new=1&remind=1", label: "Reminder", icon: BellRing },
  { href: "/ideas?new=1", label: "Idea", icon: Lightbulb },
  { href: "/time", label: "Time entry", icon: Timer },
  { href: "/crm/new", label: "Client", icon: Building2 },
];

export default function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(20,20,30,0.55)] animate-[fade-in_150ms_ease-out]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-sheet-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-t-[30px] bg-white px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+24px)] outline-none animate-[sheet-up_220ms_cubic-bezier(0.2,0.8,0.2,1)] sm:rounded-[28px] sm:pb-6"
      >
        <div className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-[#D9D2CA] sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-sheet-title" className="font-display text-4xl leading-none tracking-wide">
            Create<span className="text-brand">.</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#F1ECE6] text-ink"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={onClose}
              className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[20px] bg-cream text-[13px] font-semibold text-ink transition active:scale-[0.97] hover:bg-brand-pale"
            >
              <Icon className="w-[22px] h-[22px]" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
