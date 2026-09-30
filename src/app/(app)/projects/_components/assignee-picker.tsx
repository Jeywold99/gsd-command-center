"use client";

import { useState, useTransition } from "react";
import { setAssignees } from "../actions";
import { initials } from "./task-badges";

export default function AssigneePicker({
  taskId,
  projectId,
  users,
  initial,
}: {
  taskId: string;
  projectId: string | null;
  users: { id: string; name: string; role: string }[];
  initial: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [pending, start] = useTransition();

  const toggle = (uid: string) => {
    const next = selected.includes(uid)
      ? selected.filter((x) => x !== uid)
      : [...selected, uid];
    setSelected(next);
    start(async () => {
      await setAssignees(taskId, projectId, next);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {users.map((u) => {
          const on = selected.includes(u.id);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition ${
                on
                  ? "bg-midnight text-white border-midnight"
                  : "bg-white text-ink/60 border-black/10 hover:border-black/25"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                  on ? "bg-brand text-ink" : "bg-cream text-ink/50"
                }`}
              >
                {initials(u.name)}
              </span>
              {u.name}
            </button>
          );
        })}
      </div>
      {pending && <span className="text-xs text-black/30">saving…</span>}
    </div>
  );
}
