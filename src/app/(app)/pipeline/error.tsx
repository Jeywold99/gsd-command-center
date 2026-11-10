"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { btnPrimary } from "./_components/styles";

// Keeps a Pipeline failure (Supabase down, a missing migration, a bad key) inside the Pipeline section:
// the rest of the Command Center keeps working. The detailed cause is in the server log.
export default function PipelineError(props: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  const { error } = props;
  useEffect(() => {
    console.error(error);
  }, [error]);

  const again = props.retry ?? props.reset;
  return (
    <div className="mx-auto max-w-xl rounded-[22px] border border-black/[0.07] bg-white p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-red-50 text-red-700">
        <TriangleAlert className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-[34px] leading-none tracking-[0.01em]">Could not load the Pipeline</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#6B645D]">
        The job tracker database did not answer as expected. This is usually brief. If it keeps happening, check that the
        Supabase migrations are applied and the server has the right Supabase settings.
      </p>
      {error.digest && <p className="mt-2 text-xs text-[#6B645D]">Reference: {error.digest}</p>}
      {again && (
        <button type="button" onClick={() => again()} className={`${btnPrimary} mt-5`}>
          Try again
        </button>
      )}
    </div>
  );
}
