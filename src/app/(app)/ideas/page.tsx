import Link from "next/link";
import { Star, ArrowUpRight, Mic, Trash2, Plus, ListChecks } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { listIdeas } from "@/lib/voice-notes";
import { taskPath } from "@/lib/task-path";
import LocalTime from "../_components/local-time";
import { CaptureTabs } from "../voice/_components/voice-split";
import { createIdea, toggleIdeaStar, ideaToTask, deleteIdea } from "./actions";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "voice", label: "From voice" },
  { key: "starred", label: "Starred" },
] as const;

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; new?: string }>;
}) {
  const session = await verifySession();
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all";
  const all = await listIdeas(session.userId);
  const ideas = all.filter((i) =>
    filter === "voice" ? i.voiceNoteId : filter === "starred" ? i.isStarred : true,
  );

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:opacity-40";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 lg:flex-none">
          <CaptureTabs active="ideas" />
        </div>
      </div>

      <form action={createIdea} className="flex items-center gap-2 rounded-[18px] border-2 border-midnight bg-white p-1.5 pl-4">
        <label htmlFor="new-idea" className="sr-only">
          New idea
        </label>
        <input
          id="new-idea"
          name="text"
          required
          autoFocus={sp.new === "1"}
          placeholder="Capture an idea…"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8A827A]"
        />
        <button
          type="submit"
          className="flex h-11 items-center gap-1.5 rounded-[13px] bg-brand px-4 text-sm font-bold text-ink"
        >
          <Plus className="w-4 h-4" strokeWidth={2.6} />
          Add
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const count =
            f.key === "all" ? all.length : f.key === "voice" ? all.filter((i) => i.voiceNoteId).length : all.filter((i) => i.isStarred).length;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/ideas" : `/ideas?filter=${f.key}`}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center rounded-full px-3.5 text-[13px] ${
                active
                  ? "bg-brand-pale font-bold text-[#6E2800]"
                  : "border border-black/10 bg-white font-semibold text-[#4F4943]"
              }`}
            >
              {f.label} · {count}
            </Link>
          );
        })}
      </div>

      {ideas.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-black/15 bg-white p-6 text-center text-sm text-[#6B645D]">
          {filter === "all"
            ? "No ideas yet. Say “idea…” in a voice note, or add one above."
            : "Nothing here yet."}
        </p>
      ) : (
        <div className="columns-2 gap-2.5 md:columns-3 xl:columns-4">
          {ideas.map((idea) => {
            const dark = idea.isStarred;
            return (
              <article
                key={idea.id}
                className={`mb-2.5 flex break-inside-avoid flex-col gap-3.5 rounded-[22px] p-4 ${
                  dark ? "bg-midnight text-white" : "border border-black/[0.07] bg-white"
                }`}
              >
                <p className={`m-0 font-semibold leading-snug ${dark ? "text-[17px]" : "text-[15px]"}`}>
                  {idea.text}
                </p>
                <span
                  className={`-mb-1.5 flex items-center gap-1 text-xs ${dark ? "text-white/70" : "text-[#6B645D]"}`}
                >
                  {idea.voiceNoteId && <Mic className="w-3 h-3" aria-label="From a voice note" />}
                  <LocalTime date={idea.createdAt} format="date" />
                </span>
                <div className="-mr-1.5 flex items-center justify-end gap-1">
                  <form action={toggleIdeaStar}>
                    <input type="hidden" name="id" value={idea.id} />
                    <button
                      type="submit"
                      aria-label={idea.isStarred ? "Unstar idea" : "Star idea"}
                      aria-pressed={idea.isStarred}
                      className={`${iconBtn} ${dark ? "text-[#FF9A5C] hover:bg-white/10" : "text-[#6B645D] hover:bg-cream"}`}
                    >
                      <Star className={`w-4 h-4 ${idea.isStarred ? "fill-current" : ""}`} />
                    </button>
                  </form>
                  {idea.taskId ? (
                    <Link
                      href={taskPath(idea.taskId)}
                      aria-label="Open task"
                      title="Open task"
                      className={`${iconBtn} ${dark ? "bg-white/10 text-white" : "bg-[#DDF5EA] text-[#0B5C3D]"}`}
                    >
                      <ListChecks className="w-4 h-4" />
                    </Link>
                  ) : (
                    <form action={ideaToTask}>
                      <input type="hidden" name="id" value={idea.id} />
                      <button
                        type="submit"
                        aria-label="Turn into a task"
                        title="Turn into a task"
                        className={`${iconBtn} ${dark ? "bg-brand text-ink" : "border border-black/10 text-ink hover:bg-cream"}`}
                      >
                        <ArrowUpRight className="w-4 h-4" strokeWidth={2.2} />
                      </button>
                    </form>
                  )}
                  <form action={deleteIdea}>
                    <input type="hidden" name="id" value={idea.id} />
                    <button
                      type="submit"
                      aria-label="Delete idea"
                      className={`${iconBtn} ${dark ? "text-white/60 hover:bg-white/10" : "text-[#6B645D] hover:bg-red-50 hover:text-[#B42318]"}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
