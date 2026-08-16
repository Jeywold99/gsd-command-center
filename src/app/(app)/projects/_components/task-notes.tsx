"use client";

import dynamic from "next/dynamic";

// BlockNote uses browser-only APIs, so load the editor client-side only.
const NotesEditor = dynamic(() => import("./notes-editor"), {
  ssr: false,
  loading: () => <p className="text-sm text-black/40">Loading editor…</p>,
});

export default function TaskNotes({
  taskId,
  initialContent,
}: {
  taskId: string;
  initialContent: unknown;
}) {
  return <NotesEditor taskId={taskId} initialContent={initialContent} />;
}
