import Link from "next/link";
import { Inbox as InboxIcon, Flag, Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { listThreads, getThread, type InboxFilter } from "@/lib/email";
import { fmtDate } from "@/lib/format";
import { toggleThreadNeedsReply } from "./actions";
import ReplyComposer from "./_components/reply-composer";
import MarkThreadRead from "./_components/mark-thread-read";

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "needs-reply", label: "Needs reply" },
];

function preview(s: string, n = 90) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = (["unread", "needs-reply"].includes(sp.filter ?? "")
    ? sp.filter
    : "all") as InboxFilter;

  const user = await getCurrentUser();
  const canSend = user?.role === "OWNER" || user?.role === "MANAGER";

  const [threads, selected] = await Promise.all([
    listThreads(filter),
    sp.thread ? getThread(sp.thread) : Promise.resolve(null),
  ]);

  // Thread transcript excludes the working draft (it lives in the composer).
  const transcript = selected?.messages.filter((m) => m.status !== "DRAFT") ?? [];
  const draft = selected?.messages.find((m) => m.status === "DRAFT");
  const latestInbound = [...(selected?.messages ?? [])]
    .reverse()
    .find((m) => m.direction === "INBOUND");
  const threadHasUnread = (selected?.messages ?? []).some(
    (m) => m.direction === "INBOUND" && !m.isRead,
  );
  const threadNeedsReply = latestInbound?.needsReply ?? false;

  // Below `lg` there's only room for one pane — show the list until a thread
  // is picked (tracked in the URL already), then swap to just the
  // conversation with a way back, instead of squeezing both into ~375px.
  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
      {/* ── Thread list ── */}
      <aside
        className={`${selected ? "hidden lg:flex" : "flex"} w-full lg:w-80 shrink-0 border-r border-black/[0.07] flex-col`}
      >
        <div className="p-3 border-b border-black/[0.06]">
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/inbox?filter=${f.key}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition ${
                  filter === f.key
                    ? "bg-brand text-white"
                    : "text-ink/55 hover:bg-black/[0.04]"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-8 text-center text-sm text-black/45">
              <InboxIcon className="w-8 h-8 mx-auto text-black/15" />
              <p className="mt-2">No conversations here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {threads.map((t) => {
                const last = t.messages[0];
                const unread = t._count.messages > 0;
                const active = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/inbox?thread=${t.id}&filter=${filter}`}
                      className={`block px-4 py-3 transition-colors ${
                        active ? "bg-brand/[0.06]" : "hover:bg-black/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: t.client?.colorHex ?? "#cbd5e1" }}
                          aria-hidden
                        />
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            unread ? "font-bold text-ink" : "font-medium text-ink/80"
                          }`}
                        >
                          {t.subject}
                        </span>
                        {last?.needsReply && (
                          <Flag className="w-3.5 h-3.5 text-brand shrink-0" />
                        )}
                        <span className="text-[10px] text-black/35 shrink-0">
                          {fmtDate(t.lastMessageAt, { compact: true })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-black/45 truncate">
                        {t.client?.companyName ?? last?.fromName ?? last?.fromEmail ?? "Unknown"}
                      </p>
                      {last && (
                        <p className="mt-0.5 text-xs text-black/40 truncate">
                          {preview(last.bodyText)}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Conversation ── */}
      <section className={`${selected ? "flex" : "hidden lg:flex"} flex-1 flex-col min-w-0`}>
        {selected && (
          <Link
            href={`/inbox?filter=${filter}`}
            className="lg:hidden flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink border-b border-black/[0.07]"
          >
            ← Back to inbox
          </Link>
        )}
        {!selected ? (
          <div className="flex-1 grid place-items-center text-center text-black/40">
            <div>
              <InboxIcon className="w-10 h-10 mx-auto text-black/15" />
              <p className="mt-2 text-sm">Select a conversation to read and reply.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="px-5 py-3 border-b border-black/[0.07] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl tracking-wide text-ink truncate">
                  {selected.subject}
                </h2>
                <div className="mt-0.5 text-xs">
                  {selected.client ? (
                    <Link
                      href={`/crm/${selected.client.id}`}
                      className="inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {selected.client.companyName}
                    </Link>
                  ) : (
                    <span className="text-black/45">
                      Unmatched sender · potential lead
                    </span>
                  )}
                </div>
              </div>
              <form action={toggleThreadNeedsReply.bind(null, selected.id)}>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide border transition shrink-0 ${
                    threadNeedsReply
                      ? "bg-brand/10 text-brand border-brand/30"
                      : "text-ink/55 border-black/10 hover:bg-black/[0.04]"
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {threadNeedsReply ? "Needs reply" : "Flag reply"}
                </button>
              </form>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {transcript.map((m) => {
                const outbound = m.direction === "OUTBOUND";
                return (
                  <div
                    key={m.id}
                    className={`max-w-[80%] ${outbound ? "ml-auto" : ""}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                        outbound
                          ? "bg-brand/10 text-ink rounded-tr-sm"
                          : "bg-black/[0.04] text-ink rounded-tl-sm"
                      }`}
                    >
                      {m.bodyText}
                    </div>
                    <div
                      className={`mt-1 text-[10px] text-black/40 flex gap-2 ${
                        outbound ? "justify-end" : ""
                      }`}
                    >
                      <span>
                        {outbound
                          ? (m.author?.name ?? "Team")
                          : (m.fromName ?? m.fromEmail)}
                      </span>
                      <span>·</span>
                      <span>{fmtDate(m.createdAt)}</span>
                      {outbound && m.status !== "SENT" && (
                        <>
                          <span>·</span>
                          <span className="uppercase font-bold text-brand">
                            {m.status === "QUEUED" ? "Queued" : m.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <MarkThreadRead threadId={selected.id} hasUnread={threadHasUnread} />
            <ReplyComposer
              threadId={selected.id}
              canSend={canSend}
              initialDraft={draft?.bodyText ?? ""}
              to={latestInbound?.fromEmail ?? ""}
            />
          </>
        )}
      </section>
    </div>
  );
}
