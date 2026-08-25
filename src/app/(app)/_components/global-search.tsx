"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, FolderKanban, ListChecks, FileText, X } from "lucide-react";
import { runGlobalSearch } from "../search-actions";
import type { SearchResult } from "@/lib/search";

const TYPE_ICON: Record<SearchResult["type"], typeof Building2> = {
  client: Building2,
  project: FolderKanban,
  task: ListChecks,
  document: FileText,
};
const TYPE_LABEL: Record<SearchResult["type"], string> = {
  client: "Clients",
  project: "Projects",
  task: "Tasks",
  document: "Documents",
};
const TYPE_ORDER: SearchResult["type"][] = ["client", "project", "task", "document"];

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  // Global Cmd/Ctrl+K to open, from anywhere in the app.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      const reset = () => {
        setQuery("");
        setResults([]);
        setSelected(0);
      };
      reset();
    }
  }, [open]);

  // Debounced search — cancels the previous timer and ignores stale
  // responses (a slower earlier request finishing after a newer one).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      const clear = () => {
        setResults([]);
        setLoading(false);
      };
      clear();
      return;
    }
    const startLoading = () => setLoading(true);
    startLoading();
    const id = ++requestId.current;
    debounceRef.current = setTimeout(async () => {
      const r = await runGlobalSearch(q);
      if (id === requestId.current) {
        setResults(r);
        setLoading(false);
        setSelected(0);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function go(r: SearchResult) {
    setOpen(false);
    router.push(r.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selected]) go(results[selected]);
    }
  }

  // Flat list with running index, but rendered grouped by type.
  let runningIndex = -1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex items-center gap-2 rounded-full border border-black/10 hover:border-brand/40 hover:bg-brand-pale text-ink/50 hover:text-brand px-3 py-1.5 text-sm transition-colors"
        aria-label="Search"
      >
        <Search className="w-4 h-4" />
        <span className="text-xs">Search…</span>
        <kbd className="text-[10px] font-bold text-ink/30 border border-black/10 rounded px-1">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 rounded-full text-ink/60 hover:text-ink hover:bg-black/[0.04] transition"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.07]">
              <Search className="w-5 h-5 text-ink/35 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search clients, projects, tasks, documents…"
                className="flex-1 min-w-0 text-base text-ink placeholder:text-black/35 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-ink/40 hover:text-ink hover:bg-black/[0.04] shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-5 py-8 text-center text-sm text-black/35">
                  Keep typing — at least 2 characters.
                </p>
              ) : loading ? (
                <p className="px-5 py-8 text-center text-sm text-black/35">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-black/35">
                  No matches for &ldquo;{query}&rdquo;.
                </p>
              ) : (
                TYPE_ORDER.map((type) => {
                  const items = results.filter((r) => r.type === type);
                  if (items.length === 0) return null;
                  const Icon = TYPE_ICON[type];
                  return (
                    <div key={type} className="py-2">
                      <p className="px-5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35">
                        {TYPE_LABEL[type]}
                      </p>
                      {items.map((r) => {
                        runningIndex++;
                        const isSelected = runningIndex === selected;
                        return (
                          <button
                            key={`${r.type}-${r.id}`}
                            type="button"
                            onClick={() => go(r)}
                            onMouseEnter={() => setSelected(runningIndex)}
                            className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                              isSelected ? "bg-brand/[0.06]" : "hover:bg-black/[0.02]"
                            }`}
                          >
                            {r.colorHex ? (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: r.colorHex }}
                              />
                            ) : (
                              <Icon className="w-4 h-4 shrink-0 text-ink/30" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-ink truncate">
                                {r.title}
                              </span>
                              {r.subtitle && (
                                <span className="block text-xs text-black/40 truncate">
                                  {r.subtitle}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
