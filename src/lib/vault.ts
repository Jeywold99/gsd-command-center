import "server-only";
import { prisma } from "./prisma";

// The Vault is the deliberate document library: files uploaded directly here or
// into a project folder. Task-owned files (Notes/attachments, taskId set) and
// chat attachments (messageId set) are scoped to their task/message and excluded.
const VAULT_SCOPE = { messageId: null, taskId: null } as const;

const documentSelect = {
  id: true,
  name: true,
  mimeType: true,
  sizeBytes: true,
  category: true,
  createdAt: true,
  clientId: true,
  uploadedBy: { select: { name: true } },
  client: { select: { companyName: true } },
  project: { select: { name: true } },
} as const;

export type ClientDocSummary = {
  id: string | null; // null = the "Internal" bucket
  companyName: string;
  colorHex: string | null;
  docCount: number;
};

// One tile per client (+ an "Internal" bucket for documents with no client)
// for the /vault directory — pick a client, see just their documents. Churned
// clients are excluded, same rule as everywhere else.
export async function listClientsWithDocuments(): Promise<ClientDocSummary[]> {
  const docs = await prisma.document.findMany({
    where: { ...VAULT_SCOPE, OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }] },
    select: {
      clientId: true,
      client: { select: { id: true, companyName: true, colorHex: true } },
    },
  });

  const map = new Map<string, ClientDocSummary>();
  for (const d of docs) {
    const key = d.clientId ?? "__internal__";
    if (!map.has(key)) {
      map.set(key, {
        id: d.clientId,
        companyName: d.client?.companyName ?? "Internal",
        colorHex: d.client?.colorHex ?? null,
        docCount: 0,
      });
    }
    map.get(key)!.docCount++;
  }

  return [...map.values()].sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return a.companyName.localeCompare(b.companyName);
  });
}

// A single client's vault documents — the /vault/client/[id] view. clientId=null
// means the "Internal" bucket (documents with no client). Pass a category to
// scope further, matching this client's own filter pills.
export async function listDocumentsForClient(clientId: string | null, category?: string) {
  return prisma.document.findMany({
    where: {
      ...VAULT_SCOPE,
      clientId,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
}

// Churned clients' documents — kept reachable (not deleted), tucked away off
// the main directory. Same "hidden but recoverable" treatment churned clients
// already get for projects and passwords.
export async function listChurnedClientDocuments() {
  return prisma.document.findMany({
    where: { ...VAULT_SCOPE, client: { is: { status: "CHURNED" } } },
    orderBy: [{ client: { companyName: "asc" } }, { createdAt: "desc" }],
    select: documentSelect,
  });
}

// Categories present, optionally scoped to one client/bucket (for its filter
// pills). Omit clientId for the full site-wide list (used as upload-form
// suggestions, so tagging vocabulary stays consistent across clients).
export async function listCategories(clientId?: string | null) {
  const rows = await prisma.document.findMany({
    where: {
      ...VAULT_SCOPE,
      category: { not: null },
      ...(clientId !== undefined ? { clientId } : {}),
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category).filter((c): c is string => !!c);
}

export type DocListItem = Awaited<ReturnType<typeof listDocumentsForClient>>[number];
