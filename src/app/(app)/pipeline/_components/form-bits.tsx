"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/pipeline/types";

// Submit button that disables itself and shows a spinner while its form's action runs.
export function SubmitButton({
  children,
  className,
  formAction,
  pendingLabel,
}: {
  children: React.ReactNode;
  className: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} formAction={formAction} className={className}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

// Result line under a form: green on success, red on error, nothing otherwise.
export function FormNote({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-[12px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="rounded-[12px] bg-success/10 px-3.5 py-2.5 text-sm font-medium text-[#0B7A52]">
        {state.message}
      </p>
    );
  }
  return null;
}
