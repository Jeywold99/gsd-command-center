"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { previewPost, saveNewApplication } from "../actions";
import { NEW_STATUSES, emptyDraft, type Draft, type DraftRequirement } from "@/lib/pipeline/draft";
import {
  APPLIED_AS,
  APPLIED_AS_LABEL,
  PLATFORMS,
  PLATFORM_LABEL,
  REQUIREMENT_LABEL,
  REQUIREMENT_TYPES,
  STATUS_LABEL,
} from "@/lib/pipeline/types";
import { SubmitButton } from "./form-bits";
import { btnGhost, btnPrimary, card, eyebrow, input, label } from "./styles";

const AI_CHAR_LIMIT = 12_000; // the free AI plan reads about this much of a post

// Step 1 (paste a post, the AI reads it) -> Step 2 (review and edit everything) -> save.
export default function AddFlow({
  people,
  defaultPerson,
  aiReady,
}: {
  people: string[];
  defaultPerson: string;
  aiReady: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fromAi, setFromAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState(defaultPerson);
  const [text, setText] = useState("");

  if (draft) {
    return (
      <Review
        key={fromAi ? "ai" : "manual"}
        initial={draft}
        fromAi={fromAi}
        people={people}
        onBack={() => {
          setDraft(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <section className={card}>
      <h2 className="font-display text-[34px] leading-none tracking-[0.01em]">Add from a job post</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6B645D]">
        Paste the post (best), or just its link. The AI reads it and fills in the company, role, rate, deadline, contact and
        what you must send. You check and fix everything on the next screen. Nothing is saved until you press Save.
      </p>

      <form
        className="mt-5 space-y-4"
        action={async (fd) => {
          setError(null);
          const res = await previewPost(fd);
          if (res.ok) {
            setFromAi(true);
            setDraft(res.draft);
          } else {
            setError(res.error);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div>
            <label className={label} htmlFor="a-person">
              For
            </label>
            <select id="a-person" name="person" value={person} onChange={(e) => setPerson(e.target.value)} className={input}>
              {people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="a-url">
              Job link (optional)
            </label>
            <input id="a-url" name="job_url" type="url" inputMode="url" placeholder="https://" maxLength={2000} className={input} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="a-text">
            Job post text
          </label>
          <textarea
            id="a-text"
            name="job_text"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the whole post here, including the title and how to apply."
            className={input}
          />
          <p className={`mt-1 text-xs ${text.length > AI_CHAR_LIMIT ? "font-semibold text-red-700" : "text-[#6B645D]"}`}>
            {text.length.toLocaleString()} characters
            {text.length > AI_CHAR_LIMIT ? `. The AI only reads the first ${AI_CHAR_LIMIT.toLocaleString()}; the "how to apply" part is usually near the end, so trim the middle if needed.` : ""}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-[12px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        {!aiReady && (
          <p className="rounded-[12px] bg-brand-pale px-3.5 py-2.5 text-sm font-medium text-[#B34100]">
            The AI reader is not connected on this server yet, so use &quot;Fill in by hand&quot;.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <SubmitButton className={btnPrimary} pendingLabel="Reading the post… up to a minute">
            <Sparkles className="h-4 w-4" aria-hidden /> Read the post
          </SubmitButton>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setFromAi(false);
              setDraft(emptyDraft(person));
            }}
          >
            Fill in by hand
          </button>
        </div>
      </form>
    </section>
  );
}

function Review({
  initial,
  fromAi,
  people,
  onBack,
}: {
  initial: Draft;
  fromAi: boolean;
  people: string[];
  onBack: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState<{ message: string; existingId?: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const setReq = (i: number, patch: Partial<DraftRequirement>) =>
    setD((prev) => ({ ...prev, requirements: prev.requirements.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSaving(async () => {
      // On success the server redirects to the new application, so this only returns for a problem.
      const res = await saveNewApplication(d);
      if (res && !res.ok) setError({ message: res.error, existingId: res.existingId });
    });
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <section className={card}>
        <p className={eyebrow}>{fromAi ? "Step 2 · Check what the AI found" : "Step 2 · Fill in the details"}</p>
        <h2 className="mt-1 font-display text-[34px] leading-none tracking-[0.01em]">Review</h2>
        {fromAi && (
          <div className="mt-3 space-y-1 text-sm text-[#6B645D]">
            <p>The AI can be wrong, so read each field. Nothing is saved until you press Save.</p>
            {!d.company && <p className="font-semibold text-[#B34100]">No company name was found. It will show as &quot;Unnamed company&quot; unless you type one.</p>}
            {!d.deadline && <p>No deadline was found.</p>}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="r-company">
              Company
            </label>
            <input id="r-company" value={d.company} onChange={(e) => set("company", e.target.value)} maxLength={200} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="r-role">
              Role
            </label>
            <input id="r-role" required value={d.role} onChange={(e) => set("role", e.target.value)} maxLength={200} className={input} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="r-person">
              For
            </label>
            <select id="r-person" value={d.person} onChange={(e) => set("person", e.target.value)} className={input}>
              {people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="r-status">
              Start as
            </label>
            <select id="r-status" value={d.status} onChange={(e) => set("status", e.target.value)} className={input}>
              {NEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="r-as">
              Applied as
            </label>
            <select id="r-as" value={d.applied_as} onChange={(e) => set("applied_as", e.target.value)} className={input}>
              <option value="">—</option>
              {APPLIED_AS.map((a) => (
                <option key={a} value={a}>
                  {APPLIED_AS_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="r-platform">
              Platform
            </label>
            <select id="r-platform" value={d.platform} onChange={(e) => set("platform", e.target.value)} className={input}>
              <option value="">—</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="r-rate">
              Rate offered
            </label>
            <input id="r-rate" value={d.rate_offered} onChange={(e) => set("rate_offered", e.target.value)} maxLength={200} placeholder="e.g. $8/hr" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="r-deadline">
              Deadline
            </label>
            <input id="r-deadline" type="datetime-local" value={d.deadline} onChange={(e) => set("deadline", e.target.value)} className={input} />
          </div>
        </div>

        <div className="mt-4">
          <label className={label} htmlFor="r-url">
            Job post link
          </label>
          <input id="r-url" type="url" inputMode="url" value={d.job_url} onChange={(e) => set("job_url", e.target.value)} maxLength={2000} placeholder="https://" className={input} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="r-cname">
              Contact name
            </label>
            <input id="r-cname" value={d.contact_name} onChange={(e) => set("contact_name", e.target.value)} maxLength={200} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="r-cemail">
              Contact email
            </label>
            <input id="r-cemail" type="email" inputMode="email" value={d.contact_email} onChange={(e) => set("contact_email", e.target.value)} maxLength={320} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="r-domain">
              Company website
            </label>
            <input id="r-domain" value={d.company_domain} onChange={(e) => set("company_domain", e.target.value)} maxLength={200} placeholder="acme.com" className={input} />
          </div>
        </div>
        <p className="mt-1 text-xs text-[#6B645D]">The contact email and company website help the inbox watcher recognise replies from this company.</p>

        <div className="mt-4">
          <label className={label} htmlFor="r-notes">
            Notes
          </label>
          <textarea id="r-notes" rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} maxLength={20000} className={input} />
        </div>
      </section>

      <section className={card}>
        <h3 className="font-display text-[28px] leading-none tracking-[0.01em]">What you must send</h3>
        <p className="mt-1 text-sm text-[#6B645D]">Each item becomes a to-do on the application. Remove what is wrong, add what is missing.</p>

        <ul className="mt-4 space-y-3">
          {d.requirements.map((r, i) => (
            <li key={i} className="rounded-[16px] bg-cream p-3.5">
              <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)_200px]">
                <div>
                  <label className="sr-only" htmlFor={`rq-type-${i}`}>
                    Kind
                  </label>
                  <select id={`rq-type-${i}`} value={r.type} onChange={(e) => setReq(i, { type: e.target.value })} className={input}>
                    {REQUIREMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {REQUIREMENT_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="sr-only" htmlFor={`rq-desc-${i}`}>
                    What exactly
                  </label>
                  <input
                    id={`rq-desc-${i}`}
                    value={r.description}
                    onChange={(e) => setReq(i, { description: e.target.value })}
                    maxLength={1000}
                    placeholder="What exactly"
                    className={input}
                  />
                </div>
                <div>
                  <label className="sr-only" htmlFor={`rq-due-${i}`}>
                    Due
                  </label>
                  <input id={`rq-due-${i}`} type="datetime-local" value={r.due} onChange={(e) => setReq(i, { due: e.target.value })} className={input} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setD((prev) => ({ ...prev, requirements: prev.requirements.filter((_, j) => j !== i) }))}
                className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm font-bold text-red-700 hover:underline"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </button>
            </li>
          ))}
        </ul>
        {d.requirements.length === 0 && <p className="mt-3 text-sm text-[#6B645D]">Nothing special is required.</p>}

        <button
          type="button"
          onClick={() => setD((prev) => ({ ...prev, requirements: [...prev.requirements, { type: "loom", description: "", due: "" }] }))}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#B34100] hover:underline"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add a requirement
        </button>
      </section>

      {error && (
        <div role="alert" className="rounded-[12px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error.message}{" "}
          {error.existingId && (
            <Link href={`/pipeline/applications/${error.existingId}`} className="font-bold underline">
              Open it
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {saving ? "Saving…" : "Save application"}
        </button>
        <button type="button" onClick={onBack} disabled={saving} className={btnGhost}>
          Start over
        </button>
      </div>
    </form>
  );
}
