import Link from "next/link";
import { Plus, Hash, MessageSquare, ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { listChannels, getChannel, getMessages } from "@/lib/chat";
import { listActiveClients, listUsers } from "@/lib/projects";
import { listProjectOptions } from "@/lib/time";
import { createChannel, archiveChannel } from "./actions";
import ChatRoom from "./_components/chat-room";
import AddModal from "../_components/add-modal";
import ConfirmDelete from "../_components/confirm-delete";

const input =
  "w-full bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-semibold text-[#6B645D] mb-1.5";

const SCOPE_LABEL: Record<string, string> = {
  GENERAL: "General",
  CLIENT: "Client Channels",
  PROJECT: "Project Channels",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel } = await searchParams;
  const [me, channels, clients, projects, users] = await Promise.all([
    getCurrentUser(),
    listChannels(),
    listActiveClients(),
    listProjectOptions(),
    listUsers(),
  ]);

  const selected = channel ? await getChannel(channel) : null;
  const messages = selected ? await getMessages(selected.id) : [];

  const groups = (["GENERAL", "CLIENT", "PROJECT"] as const).map((scope) => ({
    scope,
    items: channels.filter((c) => c.scope === scope),
  }));

  // Below `lg` there's only room for one pane — show the channel list until
  // one is picked (tracked in the URL already), then swap to just the room
  // with a way back, instead of squeezing a 240px sidebar into ~375px.
  return (
    <div
      className={`flex overflow-hidden rounded-[22px] border border-black/[0.07] bg-white lg:h-[calc(100dvh-15rem)] lg:min-h-[520px] ${
        // Phones: the open room fills the screen between the top and the tab bar.
        selected ? "h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-9.5rem)]" : ""
      }`}
    >
      {/* Channel sidebar */}
      <aside
        className={`${selected ? "hidden lg:flex" : "flex"} w-full lg:w-64 shrink-0 border-r border-black/[0.07] flex-col`}
      >
        <div className="px-4 py-3 border-b border-black/[0.07] flex items-center justify-between">
          <span className="text-[17px] font-bold text-ink">Channels</span>
          <AddModal
            title="New Channel"
            triggerClassName="w-10 h-10 rounded-[13px] bg-brand text-ink flex items-center justify-center"
            triggerAriaLabel="New channel"
            trigger={<Plus className="w-5 h-5" strokeWidth={2.4} />}
          >
            <form action={createChannel} className="space-y-3">
              <div>
                <label className={label}>Channel name *</label>
                <input name="name" required autoFocus placeholder="acme-launch" className={input} />
              </div>
              <div>
                <label className={label}>Scope</label>
                <select name="scope" className={input} defaultValue="GENERAL">
                  <option value="GENERAL">General</option>
                  <option value="CLIENT">Client</option>
                  <option value="PROJECT">Project</option>
                </select>
              </div>
              <div>
                <label className={label}>Client (if client scope)</label>
                <select name="clientId" className={input} defaultValue="">
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Project (if project scope)</label>
                <select name="projectId" className={input} defaultValue="">
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="min-h-11 w-full bg-brand hover:bg-brand-hover text-ink text-sm font-bold py-2.5 rounded-[14px] transition-colors"
              >
                Create Channel
              </button>
            </form>
          </AddModal>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {channels.length === 0 && (
            <p className="text-xs text-black/40 px-2 py-4 text-center">
              No channels yet. Create one with +
            </p>
          )}
          {groups.map(
            (g) =>
              g.items.length > 0 && (
                <div key={g.scope}>
                  <p className="px-2 mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B645D]">
                    {SCOPE_LABEL[g.scope]}
                  </p>
                  <div className="space-y-0.5">
                    {g.items.map((c) => {
                      const active = c.id === selected?.id;
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center gap-1 rounded-xl transition ${
                            active ? "bg-brand/15" : "hover:bg-cream"
                          }`}
                        >
                          <Link
                            href={`/chat?channel=${c.id}`}
                            className={`flex min-h-12 min-w-0 flex-1 items-center gap-2.5 px-2.5 text-[15px] lg:min-h-10 lg:text-sm ${
                              active ? "text-ink font-semibold" : "text-[#4F4943] font-medium"
                            }`}
                          >
                            {c.client?.colorHex ? (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.client.colorHex }} />
                            ) : (
                              <Hash className="w-4 h-4 shrink-0 text-[#6B645D]" />
                            )}
                            <span className="truncate">{c.name}</span>
                          </Link>
                          <ConfirmDelete
                            action={archiveChannel}
                            fields={{ id: c.id, currentChannel: selected?.id ?? "" }}
                            title={`Delete #${c.name}?`}
                            description="This removes it from the channel list for everyone. It can't be undone from here."
                            triggerClassName="shrink-0 flex h-9 w-9 items-center justify-center mr-1 rounded-lg text-[#8A827A] hover:text-red-600 hover:bg-red-50 transition"
                            triggerTitle={`Delete #${c.name}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className={`${selected ? "flex" : "hidden lg:flex"} flex-1 min-w-0 flex-col`}>
        {selected ? (
          <>
            <Link
              href="/chat"
              className="lg:hidden flex min-h-11 items-center gap-0.5 px-3 text-[15px] font-semibold text-[#B34100] border-b border-black/[0.07]"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
              Channels
            </Link>
            <ChatRoom
              key={selected.id}
              channelId={selected.id}
              channelName={selected.name}
              initial={messages.map((m) => ({
                id: m.id,
                content: m.content,
                createdAt: m.createdAt,
                sender: m.sender,
              }))}
              meId={me?.id ?? ""}
              users={users.map((u) => ({ id: u.id, name: u.name }))}
            />
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-pale text-brand flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7" />
            </div>
            <p className="text-black/50">
              {channels.length === 0
                ? "Create your first channel to start chatting."
                : "Select a channel to start chatting."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
