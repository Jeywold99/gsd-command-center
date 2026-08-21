"use client";

import { useRef, type ReactNode } from "react";

// Wraps a <details>-based "Add X" / "Manage" popover so it closes itself once
// a form inside is submitted. Native <details> has no such behavior on its
// own — after adding something it just stays open until clicked again.
//
// Closes on submit *intent* (right when the browser accepts the form — native
// required-field validation has already passed), not after the server action
// finishes. That's deliberate: it matches how a modal or menu normally closes
// the instant you confirm, and works whether the form redirects, revalidates
// in place, or (rarely) fails server-side — none of those cases benefit from
// the popover hanging around waiting.
export default function AutoCloseDetails({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={ref}
      className={className}
      onSubmitCapture={() => {
        if (ref.current) ref.current.open = false;
      }}
    >
      {children}
    </details>
  );
}
