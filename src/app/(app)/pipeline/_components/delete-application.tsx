"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteApplication } from "../actions";

// Two-step delete: the first click only asks. Removes the application together with its requirements and history.
export default function DeleteApplication({ id, company }: { id: string; company: string }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      // On success the server redirects to the list, so this only returns for a problem.
      const res = await deleteApplication(id);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <section className="rounded-[22px] border border-red-200 bg-red-50/50 p-4 sm:p-5" aria-labelledby="danger-h">
      <h3 id="danger-h" className="text-[15px] font-bold text-red-800">
        Delete this application
      </h3>
      {!asking ? (
        <>
          <p className="mt-1 text-sm text-red-900/70">For samples and mistakes. This also deletes its requirements and its whole history.</p>
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-red-300 bg-white px-5 text-sm font-bold text-red-700 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Delete…
          </button>
        </>
      ) : (
        <div className="mt-2">
          <p className="text-sm font-semibold text-red-900">
            Delete &quot;{company}&quot; for good? This cannot be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Yes, delete it
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm font-bold text-ink"
            >
              Keep it
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
