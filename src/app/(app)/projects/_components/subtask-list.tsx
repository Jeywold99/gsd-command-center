"use client";

import { useState } from "react";
import { createSubtask, toggleSubtask } from "../actions";

type Sub = { id: string; title: string; done: boolean };

export default function SubtaskList({
  parentId,
  projectId,
  initial,
}: {
  parentId: string;
  projectId: string | null;
  initial: Sub[];
}) {
  const [subs, setSubs] = useState<Sub[]>(initial);
  const [val, setVal] = useState("");

  const toggle = (id: string, done: boolean) => {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, done } : s)));
    void toggleSubtask(id, parentId, projectId, done);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = val.trim();
    if (!t) return;
    setVal("");
    const created = await createSubtask(parentId, projectId, t);
    if (created) setSubs((prev) => [...prev, created]);
  };

  const doneCount = subs.filter((s) => s.done).length;

  return (
    <div>
      {subs.length > 0 && (
        <p className="text-xs text-black/40 mb-2">
          {doneCount}/{subs.length} done
        </p>
      )}
      <ul className="space-y-1.5 mb-3">
        {subs.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={s.done}
              onChange={(e) => toggle(s.id, e.target.checked)}
              className="accent-brand w-4 h-4 cursor-pointer"
            />
            <span className={`text-sm ${s.done ? "line-through text-black/35" : "text-ink"}`}>
              {s.title}
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={add}>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="+ Add subtask"
          className="w-full bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
        />
      </form>
    </div>
  );
}
