"use client";

import { useRef } from "react";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
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

  function save() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void updateTaskNotes(taskId, editor.document);
    }, 800);
  }

  return (
    <div className="bn-wrap">
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
