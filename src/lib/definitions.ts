import * as z from "zod";

// App-level role union (mirrors the Prisma `Role` enum) — kept dependency-free
// so it can be imported from the edge-safe proxy without pulling in Prisma.
export type Role = "OWNER" | "MANAGER" | "STAFF";

export interface SessionPayload {
  userId: string;
  role: Role;
  expiresAt: string; // ISO string
}

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

export type LoginState =
  | {
      errors?: { email?: string[]; password?: string[] };
      message?: string;
    }
  | undefined;

// CRM create/edit form state (kept out of the "use server" actions file,
// which may only export async functions).
export type ClientFormState = { error?: string } | undefined;

// Add-team-member form state.
export type UserFormState = { error?: string; ok?: boolean } | undefined;
