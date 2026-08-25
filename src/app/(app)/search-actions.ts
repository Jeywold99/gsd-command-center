"use server";

import { verifySession } from "@/lib/dal";
import { globalSearch, type SearchResult } from "@/lib/search";

// Called directly from the GlobalSearch client component (not a form — an
// RPC-style call, same pattern as passwords/actions.ts's revealPassword).
export async function runGlobalSearch(query: string): Promise<SearchResult[]> {
  await verifySession();
  return globalSearch(query);
}
