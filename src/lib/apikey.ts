import "server-only";
import crypto from "crypto";
import { prisma } from "./prisma";

// API keys are high-entropy random tokens; store a SHA-256 hash, show the raw
// value to the user only once at creation.
export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string } {
  const raw = "gsd_" + crypto.randomBytes(24).toString("hex");
  return { raw, hash: hashKey(raw) };
}

export async function validateApiKey(raw: string | null): Promise<boolean> {
  if (!raw) return false;
  const key = await prisma.apiKey.findFirst({
    where: { hashedKey: hashKey(raw), revoked: false },
  });
  if (!key) return false;
  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return true;
}
