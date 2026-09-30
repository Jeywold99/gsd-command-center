"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const KEY = "gsd-install-hint-dismissed";

// iPhone Safari has no install prompt — nudge once toward Add to Home Screen
// (needed for full-screen + push). Hidden in the installed app and once dismissed.
export default function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      // storage blocked — show it; the X still hides it for this visit
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection
    setShow(ios && !standalone && !dismissed);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="note"
      className="fixed inset-x-3.5 z-40 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(30,30,46,0.18)] lg:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand font-display text-sm text-ink">
        GSD
      </span>
      <p className="flex-1 text-[13px] leading-snug">
        <span className="font-semibold">Install GSD HQ:</span> tap{" "}
        <Share className="inline w-3.5 h-3.5 -mt-0.5" aria-label="Share" /> then{" "}
        <span className="font-semibold">Add to Home Screen</span>.
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B645D]">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
