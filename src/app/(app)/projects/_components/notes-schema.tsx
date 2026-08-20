"use client";

import { useEffect, useRef, useState } from "react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import {
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
  FileBlockWrapper,
  FileNameWithIcon,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { Globe, Link2, Pencil, ExternalLink, X } from "lucide-react";

// Our uploaded URLs carry no file extension (`/api/files/<id>?inline=1`), so we
// detect type from the original filename (BlockNote stores it in `name`).
const RX_PDF = /\.pdf(?:$|[?#])/i;
const RX_IMG = /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)(?:$|[?#])/i;

// Reuse the built-in file block's exact config + meta (fileBlockAccept, etc.) so
// the "File" upload panel keeps working — we only replace how it RENDERS once a
// file is attached, so documents show inline instead of download-only:
//   • PDF   → embedded <iframe> viewer (our /api/files route serves ?inline=1)
//   • image → inline <img> (bonus; images usually become image blocks anyway)
//   • else (e.g. .docx, which browsers can't render) → the normal file chip
const defaultFile = defaultBlockSpecs.file;

const fileBlock = createReactBlockSpec(defaultFile.config, {
  meta: defaultFile.implementation.meta,
  render: (props) => {
    const { url, name } = props.block.props;
    const isPdf = RX_PDF.test(name) || RX_PDF.test(url);
    const isImg = RX_IMG.test(name) || RX_IMG.test(url);

    return (
      <FileBlockWrapper {...props}>
        {url && isPdf ? (
          <div className="w-full">
            <iframe
              src={url}
              title={name || "PDF"}
              className="w-full rounded-lg border border-black/10 bg-white"
              style={{ height: 520 }}
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-semibold text-brand hover:underline"
            >
              Open {name || "PDF"} in new tab ↗
            </a>
          </div>
        ) : url && isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={name || ""}
            className="max-w-full rounded-lg border border-black/10"
          />
        ) : (
          <FileNameWithIcon {...props} />
        )}
      </FileBlockWrapper>
    );
  },
})();

// ── Shared URL-entry UI for the Embed and Link blocks ───────────────────────
// Both blocks store nothing until a URL is confirmed, then render their own
// "display" mode; both can be re-opened for editing via a pencil button.

// Adds https:// when missing and validates via the URL constructor. Returns
// null for anything unparsable.
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function UrlEntryForm({
  icon,
  placeholder,
  submitLabel,
  initialUrl,
  showLabelField,
  initialLabel,
  onCancel,
  onSubmit,
}: {
  icon: React.ReactNode;
  placeholder: string;
  submitLabel: string;
  initialUrl: string;
  showLabelField?: boolean;
  initialLabel?: string;
  onCancel: (() => void) | null;
  onSubmit: (url: string, label: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [labelVal, setLabelVal] = useState(initialLabel ?? "");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError(true);
      return;
    }
    onSubmit(normalized, labelVal.trim());
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full items-center gap-2 rounded-lg border border-black/10 bg-cream/50 p-2.5"
      contentEditable={false}
    >
      <span className="text-ink/35 shrink-0">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row">
        {showLabelField && (
          <input
            value={labelVal}
            onChange={(e) => setLabelVal(e.target.value)}
            placeholder="Label (optional)"
            className="w-full sm:w-40 rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        )}
        <input
          ref={inputRef}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(false);
          }}
          placeholder={placeholder}
          className={`w-full min-w-0 flex-1 rounded-md border bg-white px-2 py-1.5 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-black/10 focus:border-brand focus:ring-brand/20"
          }`}
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-hover"
      >
        {submitLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-md p-1.5 text-ink/40 hover:bg-black/[0.04] hover:text-ink"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}

// ── Embed block: shows the target page inline in an iframe ──────────────────
// Note: some sites (Google, Notion, many banks/SaaS admin panels) send
// X-Frame-Options/CSP headers that block being framed — the iframe will just
// render blank for those. We surface "Open in new tab" alongside it so the
// block is still useful either way.

const embedBlock = createReactBlockSpec(
  {
    type: "embed",
    propSchema: { url: { default: "" } },
    content: "none",
  },
  {
    // Named (capitalized) function so eslint's react-hooks rule recognizes
    // this as a component — it calls useState, and "render:" as a bare
    // property name doesn't read as one.
    render: function EmbedBlockRender(props) {
      const { url } = props.block.props;
      const [editing, setEditing] = useState(!url);

      if (editing) {
        return (
          <UrlEntryForm
            icon={<Globe className="w-4 h-4" />}
            placeholder="Paste a page URL to embed…"
            submitLabel="Embed"
            initialUrl={url}
            onCancel={url ? () => setEditing(false) : null}
            onSubmit={(next) => {
              props.editor.updateBlock(props.block, { props: { url: next } });
              setEditing(false);
            }}
          />
        );
      }

      return (
        <div className="w-full" contentEditable={false}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink/50">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{hostnameOf(url)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1 text-ink/40 hover:bg-black/[0.04] hover:text-brand"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded p-1 text-ink/40 hover:bg-black/[0.04] hover:text-brand"
                title="Change link"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <iframe
            src={url}
            title={hostnameOf(url)}
            className="w-full rounded-lg border border-black/10 bg-white"
            style={{ height: 480 }}
          />
          <p className="mt-1 text-[11px] text-black/35">
            If this doesn&apos;t load, the site may block embedding — use &quot;Open in new
            tab&quot; above instead.
          </p>
        </div>
      );
    },
  },
)();

// ── Link block: a plain clickable link card (no iframe) ─────────────────────

const linkBlock = createReactBlockSpec(
  {
    type: "link",
    propSchema: { url: { default: "" }, title: { default: "" } },
    content: "none",
  },
  {
    render: function LinkBlockRender(props) {
      const { url, title } = props.block.props;
      const [editing, setEditing] = useState(!url);

      if (editing) {
        return (
          <UrlEntryForm
            icon={<Link2 className="w-4 h-4" />}
            placeholder="Paste a link…"
            submitLabel="Add link"
            initialUrl={url}
            showLabelField
            initialLabel={title}
            onCancel={url ? () => setEditing(false) : null}
            onSubmit={(next, label) => {
              props.editor.updateBlock(props.block, { props: { url: next, title: label } });
              setEditing(false);
            }}
          />
        );
      }

      return (
        <div className="group/link flex w-full items-center gap-2" contentEditable={false}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm transition-colors hover:border-brand/40 hover:bg-brand-pale/40"
          >
            <Link2 className="w-4 h-4 shrink-0 text-brand" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-ink">{title || hostnameOf(url)}</span>
              {title && <span className="ml-2 text-xs text-black/40">{hostnameOf(url)}</span>}
            </span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-ink/30" />
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg p-2 text-ink/30 opacity-0 transition hover:bg-black/[0.04] hover:text-brand group-hover/link:opacity-100"
            title="Edit link"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    },
  },
)();

// Schema = all default blocks, with our enhanced `file` block swapped in and
// `embed` / `link` added.
export const notesSchema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, file: fileBlock, embed: embedBlock, link: linkBlock },
});

// ── Slash menu ("/") items ────────────────────────────────────────────────
// The default items (Heading, Paragraph, File, …) plus our two new blocks —
// used in place of BlockNoteView's built-in slash menu so both show up
// together. Inserted blocks start in edit mode (empty url), so the entry form
// is immediately focused.

export function getNotesSlashMenuItems(
  editor: BlockNoteEditor<typeof notesSchema.blockSchema, typeof notesSchema.inlineContentSchema, typeof notesSchema.styleSchema>,
): DefaultReactSuggestionItem[] {
  const defaults = getDefaultReactSlashMenuItems(editor);
  // Insert ours right after "File" so Embed/Link sit with the other
  // content-block options instead of trailing at the very end.
  const fileIdx = defaults.findIndex((i) => i.title === "File");
  const insertAt = fileIdx === -1 ? defaults.length : fileIdx + 1;

  const custom: DefaultReactSuggestionItem[] = [
    {
      title: "Embed",
      subtext: "Embed a webpage inline",
      aliases: ["embed", "iframe", "webpage", "website"],
      group: "Media",
      icon: <Globe className="w-[18px] h-[18px]" />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "embed" } as never);
      },
    },
    {
      title: "Link",
      subtext: "A clickable link",
      aliases: ["link", "url", "bookmark", "hyperlink"],
      group: "Media",
      icon: <Link2 className="w-[18px] h-[18px]" />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "link" } as never);
      },
    },
  ];

  return [...defaults.slice(0, insertAt), ...custom, ...defaults.slice(insertAt)];
}

export function filterNotesSlashMenuItems(
  items: DefaultReactSuggestionItem[],
  query: string,
): DefaultReactSuggestionItem[] {
  return filterSuggestionItems(items, query);
}
