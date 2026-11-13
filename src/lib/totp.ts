import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Time-based one-time codes (RFC 6238), the 6-digit codes from Google
// Authenticator, Microsoft Authenticator, 1Password, Bitwarden and the like.
// Written with node:crypto so it needs no extra dependency on the Pi.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 secret.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// A new random secret (160 bits), base32 as authenticator apps expect.
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function codeAt(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

// True when `code` matches the current 30-second window, or one window either
// side (allows for a phone clock that is a little off).
export function verifyTotp(secretB32: string, code: string, now = Date.now()): boolean {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return false;
  const secret = base32Decode(secretB32);
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  for (const drift of [-1, 0, 1]) {
    const expected = codeAt(secret, counter + drift);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(digits))) return true;
  }
  return false;
}

// The otpauth:// link an authenticator app reads from the QR code.
export function totpUri(secretB32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}
