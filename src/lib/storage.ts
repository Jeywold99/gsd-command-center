import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Local-disk storage behind a small interface — swap the body of these three
// functions for MinIO/S3 later without touching callers.
const ROOT = process.env.STORAGE_DIR || path.join(process.cwd(), "storage", "uploads");

// The upload directory is a deliberate, runtime-configurable location outside
// the app bundle. `turbopackIgnore` stops the build tracer from pulling the
// whole project into the server output on account of these dynamic fs paths.
export async function saveFile(file: File): Promise<{ storagePath: string; sizeBytes: number }> {
  await fs.mkdir(/*turbopackIgnore: true*/ ROOT, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const key = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.name)}`;
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ ROOT, key), buf);
  return { storagePath: key, sizeBytes: buf.length };
}

// Store bytes under a caller-chosen key (e.g. a profile photo). The key is
// reduced to its basename, same as reads.
export async function saveBuffer(key: string, buf: Buffer): Promise<void> {
  await fs.mkdir(/*turbopackIgnore: true*/ ROOT, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ ROOT, path.basename(key)), buf);
}

export async function readFile(storagePath: string): Promise<Buffer> {
  // basename guards against path traversal.
  const key = path.basename(storagePath);
  return fs.readFile(path.join(/*turbopackIgnore: true*/ ROOT, key));
}

export async function removeFile(storagePath: string): Promise<void> {
  const key = path.basename(storagePath);
  try {
    await fs.unlink(path.join(/*turbopackIgnore: true*/ ROOT, key));
  } catch {
    // already gone — ignore
  }
}
