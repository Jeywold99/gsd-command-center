"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Trash2, X, Eye } from "lucide-react";
import { deleteDocument } from "../actions";

type Doc = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  category: string | null;
  createdAt: Date | string;
  uploadedBy: { name: string };
  project: { name: string } | null;
  client: { companyName: string } | null;
};

const isImage = (m: string) => m.startsWith("image/");
const isPdf = (m: string) => m === "application/pdf";
const isText = (m: string, name: string) =>
  m.startsWith("text/") || /\.(txt|md|markdown|csv|json|log|yml|yaml)$/i.test(name);
const previewable = (d: Doc) => isImage(d.mimeType) || isPdf(d.mimeType) || isText(d.mimeType, d.name);

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DocGrid({ docs }: { docs: Doc[] }) {
  const [preview, setPreview] = useState<Doc | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {docs.map((d) => (
          <div
            key={d.id}
            className="relative group bg-white rounded-2xl border border-black/[0.07] overflow-hidden hover:border-brand/40 transition-colors"
          >
            <button
              onClick={() => setPreview(d)}
              className="block w-full text-left"
              title={previewable(d) ? "Preview" : "Open"}
            >
              <div className="h-32 bg-cream flex items-center justify-center overflow-hidden">
                {isImage(d.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${d.id}`} alt={d.name} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-10 h-10 text-black/20" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-ink truncate">{d.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  {d.category && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-brand bg-brand-pale px-1.5 py-0.5 rounded">
                      {d.category}
                    </span>
                  )}
                  <span className="text-[11px] text-black/40">{fmtBytes(d.sizeBytes)}</span>
                </div>
                <p className="mt-1 text-[11px] text-black/40 truncate">
                  {d.project?.name ?? d.client?.companyName
                    ? `${d.project?.name ?? d.client?.companyName} · `
                    : ""}
                  {fmtDate(d.createdAt)}
                </p>
              </div>
            </button>

            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <a
                href={`/api/files/${d.id}`}
                className="p-1.5 rounded-lg bg-white/90 text-ink/60 hover:text-brand shadow"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <form action={deleteDocument}>
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-white/90 text-ink/60 hover:text-red-600 shadow"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {preview && <PreviewModal key={preview.id} doc={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

function PreviewModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!isText(doc.mimeType, doc.name)) return;
    let alive = true;
    fetch(`/api/files/${doc.id}?inline=1`)
      .then((r) => r.text())
      .then((t) => alive && setText(t))
      .catch(() => alive && setText("(Could not load this file.)"));
    return () => {
      alive = false;
    };
  }, [doc]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-black/[0.07] shrink-0">
          <span className="font-semibold text-ink truncate">{doc.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/api/files/${doc.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink/60 hover:text-brand"
            >
              <Download className="w-4 h-4" /> Download
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink/50 hover:bg-black/[0.05]" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-cream/40">
          {isImage(doc.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${doc.id}`} alt={doc.name} className="max-w-full mx-auto" />
          ) : isPdf(doc.mimeType) ? (
            <iframe src={`/api/files/${doc.id}?inline=1`} title={doc.name} className="w-full h-[80vh] bg-white" />
          ) : isText(doc.mimeType, doc.name) ? (
            <pre className="p-5 text-sm text-ink whitespace-pre-wrap break-words font-mono">
              {text ?? "Loading…"}
            </pre>
          ) : (
            <div className="p-12 text-center text-black/50">
              <Eye className="w-8 h-8 mx-auto text-black/20 mb-3" />
              <p>This file type can&apos;t be previewed in the browser.</p>
              <a
                href={`/api/files/${doc.id}`}
                className="inline-block mt-3 text-brand font-semibold text-sm hover:underline"
              >
                Download to open it
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
