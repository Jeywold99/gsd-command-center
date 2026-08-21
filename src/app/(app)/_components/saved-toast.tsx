"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

type SavedDetail = { message?: string };

/** Show the shared saved confirmation after an in-place Server Action. */
export function announceSaved(message = "Changes saved") {
  window.dispatchEvent(
    new CustomEvent<SavedDetail>("gsd:saved", { detail: { message } }),
  );
}

// Lives in the app shell so all edit experiences use the same confirmation.
// Redirecting forms add `?saved=1`; in-place forms dispatch `gsd:saved`.
export default function SavedToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(nextMessage: string) {
    if (timer.current) clearTimeout(timer.current);
    setMessage(nextMessage);
    timer.current = setTimeout(() => setMessage(null), 3600);
  }

  useEffect(() => {
    if (searchParams.get("saved") !== "1") return;
    const showTimer = window.setTimeout(() => show("Changes saved"), 0);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("saved");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`);

    return () => window.clearTimeout(showTimer);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<SavedDetail>).detail;
      show(detail?.message ?? "Changes saved");
    };
    window.addEventListener("gsd:saved", onSaved);
    return () => {
      window.removeEventListener("gsd:saved", onSaved);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-20 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-success/30 bg-white px-6 py-4 text-base font-bold text-ink shadow-2xl motion-safe:animate-[saved-pop_380ms_cubic-bezier(.34,1.56,.64,1)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15">
        <CheckCircle2 className="h-5 w-5 text-success" />
      </span>
      {message}
    </div>
  );
}
