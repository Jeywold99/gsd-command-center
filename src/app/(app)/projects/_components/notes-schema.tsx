"use client";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  createReactBlockSpec,
  FileBlockWrapper,
  FileNameWithIcon,
} from "@blocknote/react";

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

// Schema = all default blocks, with our enhanced `file` block swapped in.
export const notesSchema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, file: fileBlock },
});
