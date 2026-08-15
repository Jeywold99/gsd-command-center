import "server-only";
import bcrypt from "bcryptjs";

// bcryptjs is pure-JS (no native build) — safe on ARM (the Pi) and Windows.
const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
