"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import { Loader2, CheckCircle2 } from "lucide-react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { notesSchema, getNotesSlashMenuItems, filterNotesSlashMenuItems } from "./notes-schema";
import { updateTaskNotes, uploadNoteFile } from "../actions";

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

  const editor = useCreateBlockNote({
    schema: notesSchema,
    initialContent: seed,
    // Enables the "Upload" tab on image/file/video/audio blocks (drag-drop &
    // paste too). Sends the file to our storage and returns an inline URL.
    uploadFile: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("taskId", taskId);
      return await uploadNoteFile(fd);
    },
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save() {
    if (timer.current) clearTimeout(timer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setStatus("saving");
    timer.current = setTimeout(async () => {
      await updateTaskNotes(taskId, editor.document);
      setStatus("saved");
      hideTimer.current = setTimeout(() => setStatus("idle"), 2000);
    }, 800);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div className="bn-wrap">
      {/* Notes autosave — no Save button applies here, so this is the only
          confirmation the user gets that their edits actually persisted. */}
      <div className="mb-2 flex h-4 items-center justify-end">
        {status === "saving" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
          </span>
        )}
        {status === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
      <BlockNoteView editor={editor} onChange={save} theme="light" slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterNotesSlashMenuItems(getNotesSlashMenuItems(editor), query)
          }
        />
      </BlockNoteView>
    </div>
  );
}
