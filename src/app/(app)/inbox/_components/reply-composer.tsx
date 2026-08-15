"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Save } from "lucide-react";
import { saveDraft, sendReply } from "../actions";

export default function ReplyComposer({
  threadId,
  canSend,
  initialDraft = "",
  to,
}: {
  threadId: string;
  canSend: boolean;
  initialDraft?: string;
  to: string;
}) {
  const [body, setBody] = useState(initialDraft);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      await saveDraft(threadId, body);
      setStatus("Draft saved");
      router.refresh();
    });
  }

  function handleSend() {
    if (!body.trim()) {
      setStatus("Write a reply first.");
      return;
    }
    startTransition(async () => {
      const res = await sendReply(threadId, body);
      if (res?.error) {
        setStatus(res.error);
        return;
      }
      setBody("");
      setStatus("Queued — n8n will send it shortly.");
      router.refresh();
    });
  }

  return (
    <div className="border-t border-black/[0.07] bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-black/45">
          Reply to <span className="font-medium text-ink">{to || "sender"}</span>
        </span>
        {status && <span className="text-xs text-black/45">{status}</span>}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Write your reply…"
        className="w-full resize-y bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={isPending || !body.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wide text-ink/70 hover:text-ink hover:bg-black/[0.04] disabled:opacity-40 transition"
        >
          <Save className="w-4 h-4" />
          Save draft
        </button>
        {canSend ? (
          <button
            onClick={handleSend}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide bg-brand hover:bg-brand-hover text-white disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        ) : (
          <span className="text-[11px] text-black/40">
            Only an Owner or Manager can send.
          </span>
        )}
      </div>
    </div>
  );
}
