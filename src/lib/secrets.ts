import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Symmetric encryption for the password vault. Vault passwords are encrypted at
// rest with AES-256-GCM; plaintext is never stored, logged, or sent to the
// browser except on an explicit server-side "reveal".
//
// The key is derived from a server secret — a dedicated CREDENTIAL_SECRET if set,
// otherwise SESSION_SECRET (already present in every deploy). Rotating that
// secret makes existing stored passwords undecryptable, so set a stable
// CREDENTIAL_SECRET before storing anything you can't re-enter.
//
// Stored blob format:  base64(iv) : base64(authTag) : base64(ciphertext)

const SECRET = process.env.CREDENTIAL_SECRET || process.env.SESSION_SECRET || "";

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (cachedKey) return cachedKey;
  if (!SECRET) {
    throw new Error("CREDENTIAL_SECRET (or SESSION_SECRET) must be set to use the password vault.");
  }
  // A stable per-deploy key derived from the server secret (fixed salt — a
  // random salt would have to be stored per record).
  cachedKey = scryptSync(SECRET, "gsd-credential-vault-v1", 32);
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed credential blob.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
