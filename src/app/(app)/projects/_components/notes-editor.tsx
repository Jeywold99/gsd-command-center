"use client";

import { useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { updateTaskNotes } from "../actions";

// Notion-style block editor for a task's Notes. Autosaves (debounced) to the
// task's `content` field. Loaded client-only via task-notes.tsx (no SSR).
export default function NotesEditor({
  taskId,
  initialContent,
}: {
  taskId: string;
  initialContent: unknown;
}) {
  const seed =
    Array.isArray(initialContent) && initialContent.length > 0
      ? (initialContent as PartialBlock[])
      : undefined;

  const editor = useCreateBlockNote({ initialContent: seed });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void updateTaskNotes(taskId, editor.document);
    }, 800);
  }

  return (
    <div className="-mx-2">
      <BlockNoteView editor={editor} onChange={save} theme="light" />
    </div>
  );
}
