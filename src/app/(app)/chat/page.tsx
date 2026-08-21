import Link from "next/link";
import { Plus, Hash, MessageSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { listChannels, getChannel, getMessages } from "@/lib/chat";
import { listActiveClients, listUsers } from "@/lib/projects";
import { listProjectOptions } from "@/lib/time";
import { createChannel } from "./actions";
import ChatRoom from "./_components/chat-room";
import AddModal from "../_components/add-modal";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

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

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
      {/* Channel sidebar */}
      <aside className="w-60 shrink-0 border-r border-black/[0.07] flex flex-col">
        <div className="p-3 border-b border-black/[0.07] flex items-center justify-between">
          <span className="font-display text-lg tracking-wide text-ink">Channels</span>
          <AddModal
            title="New Channel"
            triggerClassName="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center"
            trigger={<Plus className="w-4 h-4" />}
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
                className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold uppercase tracking-wide py-2.5 rounded-full transition-colors"
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
                  <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35">
                    {SCOPE_LABEL[g.scope]}
                  </p>
                  <div className="space-y-0.5">
                    {g.items.map((c) => {
                      const active = c.id === selected?.id;
                      return (
                        <Link
                          key={c.id}
                          href={`/chat?channel=${c.id}`}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition ${
                            active ? "bg-brand/15 text-ink font-semibold" : "text-ink/60 hover:bg-cream"
                          }`}
                        >
                          {c.client?.colorHex ? (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.client.colorHex }} />
                          ) : (
                            <Hash className="w-3.5 h-3.5 shrink-0 text-ink/35" />
                          )}
                          <span className="truncate">{c.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ),
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 min-w-0">
        {selected ? (
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
