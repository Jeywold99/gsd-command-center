"use client";

import { startTransition, useOptimistic, useState } from "react";
import { changeStatus } from "../actions";
import { CLOSED_STATUSES, OPEN_STATUSES, STATUS_LABEL, isStatus, type Status } from "@/lib/pipeline/types";
import { STATUS_CHIP } from "./status-chip";

// Status dropdown for the application page. The change shows at once and is rolled back if the server says no.
export default function StatusPicker({ id, status }: { id: string; status: Status }) {
  const [shown, setShown] = useOptimistic<Status, Status>(status, (_current, next) => next);
  const [error, setError] = useState<string | null>(null);

  function onChange(next: string) {
    if (!isStatus(next) || next === shown) return;
    setError(null);
    startTransition(async () => {
      setShown(next);
      const res = await changeStatus(id, next);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div>
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status
      </label>
      <select
        id={`status-${id}`}
        value={shown}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 cursor-pointer appearance-none rounded-full px-5 pr-9 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${STATUS_CHIP[shown]}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%231A1A1A' stroke-width='2' stroke-linecap='round'><path d='M1 1.5l5 5 5-5'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
      >
        <optgroup label="Pipeline">
          {OPEN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </optgroup>
        <optgroup label="Closed">
          {CLOSED_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </optgroup>
      </select>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
