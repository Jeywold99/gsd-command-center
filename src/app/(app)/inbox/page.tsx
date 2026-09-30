import Link from "next/link";
import { Inbox as InboxIcon, Flag, Building2, ChevronLeft } from "lucide-react";
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

  // Phones: the list is the screen until a thread is picked (?thread=…), then
  // the conversation takes over with a way back — both scroll with the page.
  // Desktop: a fixed-height split panel.
  return (
    <div className="lg:flex lg:h-[calc(100dvh-15rem)] lg:min-h-[520px] lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-black/[0.07] lg:bg-white">
      {/* ── Thread list ── */}
      <aside
        className={`${selected ? "hidden lg:flex" : "flex"} w-full flex-col gap-3 lg:w-[340px] lg:shrink-0 lg:gap-0 lg:border-r lg:border-black/[0.07]`}
      >
        <div className="lg:border-b lg:border-black/[0.06] lg:p-3">
          <nav aria-label="Filter" className="grid grid-cols-3 gap-1 rounded-2xl border border-black/[0.07] bg-white p-1 lg:border-0 lg:p-0">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/inbox?filter=${f.key}`}
                aria-current={filter === f.key ? "page" : undefined}
                className={`flex h-[38px] items-center justify-center rounded-xl text-sm font-semibold transition ${
                  filter === f.key ? "bg-midnight text-white" : "text-[#4F4943] hover:bg-cream"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto">
          {threads.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-black/15 bg-white p-8 text-center text-sm text-[#6B645D] lg:rounded-none lg:border-0">
              <InboxIcon className="mx-auto h-8 w-8 text-black/15" />
              <p className="mt-2">No conversations here.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5 lg:gap-0 lg:divide-y lg:divide-black/[0.05]">
              {threads.map((t) => {
                const last = t.messages[0];
                const unread = t._count.messages > 0;
                const active = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/inbox?thread=${t.id}&filter=${filter}`}
                      className={`flex flex-col gap-1 rounded-[22px] border border-black/[0.07] bg-white p-4 transition-colors lg:rounded-none lg:border-0 lg:px-4 lg:py-3 ${
                        active ? "lg:bg-[#FFF1E6]" : "lg:hover:bg-cream"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: t.client?.colorHex ?? "#cbd5e1" }}
                          aria-hidden
                        />
                        <span
                          className={`min-w-0 flex-1 truncate text-[15px] lg:text-sm ${
                            unread ? "font-bold text-ink" : "font-medium text-[#4F4943]"
                          }`}
                        >
                          {t.subject}
                        </span>
                        {last?.needsReply && <Flag className="h-3.5 w-3.5 shrink-0 text-[#B34100]" aria-label="Needs reply" />}
                        <span className="shrink-0 text-xs text-[#6B645D]">
                          {fmtDate(t.lastMessageAt, { compact: true })}
                        </span>
                      </span>
                      <span className="truncate text-[13px] font-medium text-[#6B645D] lg:text-xs">
                        {t.client?.companyName ?? last?.fromName ?? last?.fromEmail ?? "Unknown"}
                      </span>
                      {last && <span className="truncate text-[13px] text-[#8A827A] lg:text-xs">{preview(last.bodyText)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Conversation ── */}
      <section className={`${selected ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col gap-3 lg:gap-0`}>
        {selected && (
          <Link
            href={`/inbox?filter=${filter}`}
            className="-ml-1 inline-flex min-h-11 items-center gap-0.5 self-start text-[15px] font-semibold text-[#B34100] lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
            Inbox
          </Link>
        )}
        {!selected ? (
          <div className="grid flex-1 place-items-center text-center text-[#6B645D]">
            <div>
              <InboxIcon className="mx-auto h-10 w-10 text-black/15" />
              <p className="mt-2 text-sm">Select a conversation to read and reply.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-start justify-between gap-3 rounded-[22px] border border-black/[0.07] bg-white p-4 lg:rounded-none lg:border-0 lg:border-b lg:px-5 lg:py-3.5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-snug text-ink lg:truncate lg:text-[17px]">{selected.subject}</h2>
                <div className="mt-1 text-[13px]">
                  {selected.client ? (
                    <Link
                      href={`/crm/${selected.client.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#B34100] hover:underline"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {selected.client.companyName}
                    </Link>
                  ) : (
                    <span className="text-[#6B645D]">Unmatched sender · potential lead</span>
                  )}
                </div>
              </div>
              <form action={toggleThreadNeedsReply.bind(null, selected.id)}>
                <button
                  type="submit"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[13px] font-semibold transition ${
                    threadNeedsReply
                      ? "border-brand/30 bg-brand-pale text-[#8A3200]"
                      : "border-black/10 text-[#4F4943] hover:bg-cream"
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  {threadNeedsReply ? "Needs reply" : "Flag"}
                </button>
              </form>
            </header>

            <div className="flex flex-col gap-4 py-1 lg:flex-1 lg:overflow-y-auto lg:p-5">
              {transcript.map((m) => {
                const outbound = m.direction === "OUTBOUND";
                return (
                  <div key={m.id} className={`max-w-[88%] lg:max-w-[80%] ${outbound ? "ml-auto" : ""}`}>
                    <div
                      className={`whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[15px] leading-relaxed lg:text-sm ${
                        outbound
                          ? "rounded-tr-md bg-midnight text-white"
                          : "rounded-tl-md border border-black/[0.07] bg-white text-ink lg:border-0 lg:bg-cream"
                      }`}
                    >
                      {m.bodyText}
                    </div>
                    <div className={`mt-1 flex gap-2 text-[11px] text-[#6B645D] ${outbound ? "justify-end" : ""}`}>
                      <span>{outbound ? (m.author?.name ?? "Team") : (m.fromName ?? m.fromEmail)}</span>
                      <span>·</span>
                      <span>{fmtDate(m.createdAt)}</span>
                      {outbound && m.status !== "SENT" && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-[#B34100]">
                            {m.status === "QUEUED" ? "Queued" : m.status.charAt(0) + m.status.slice(1).toLowerCase()}
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
