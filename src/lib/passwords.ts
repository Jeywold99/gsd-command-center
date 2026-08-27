import "server-only";
import { prisma } from "./prisma";

// List vault credentials WITHOUT the encrypted password — the plaintext is only
// ever produced by the reveal action, so it never rides along in a page payload.
const credentialSelect = {
  id: true,
  label: true,
  scope: true,
  category: true,
  username: true,
  url: true,
  notes: true,
  clientId: true,
  client: { select: { id: true, companyName: true, colorHex: true } },
  createdBy: { select: { name: true } },
  updatedAt: true,
} as const;

export type ClientCredentialSummary = {
  id: string | null; // null = the "Internal" bucket
  companyName: string;
  colorHex: string | null;
  credentialCount: number;
};

// One tile per client (+ an "Internal" bucket for credentials with no client)
// for the /passwords directory — pick a client, see just their passwords.
// Churned clients are excluded, same rule as everywhere else.
export async function listClientsWithCredentials(): Promise<ClientCredentialSummary[]> {
  const creds = await prisma.credential.findMany({
    where: { OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }] },
    select: {
      clientId: true,
      client: { select: { id: true, companyName: true, colorHex: true } },
    },
  });

  const map = new Map<string, ClientCredentialSummary>();
  for (const c of creds) {
    const key = c.clientId ?? "__internal__";
    if (!map.has(key)) {
      map.set(key, {
        id: c.clientId,
        companyName: c.client?.companyName ?? "Internal",
        colorHex: c.client?.colorHex ?? null,
        credentialCount: 0,
      });
    }
    map.get(key)!.credentialCount++;
  }

  return [...map.values()].sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return a.companyName.localeCompare(b.companyName);
  });
}

// A single client's passwords — the /passwords/client/[id] view. clientId=null
// means the "Internal" bucket (credentials with no client).
export async function listCredentialsForClient(clientId: string | null) {
  return prisma.credential.findMany({
    where: { clientId },
    orderBy: [{ label: "asc" }],
    select: credentialSelect,
  });
}

// Churned clients' passwords — kept reachable (not deleted), tucked away off
// the main directory. Same "hidden but recoverable" treatment churned clients
// already get for projects.
export async function listChurnedClientCredentials() {
  return prisma.credential.findMany({
    where: { client: { is: { status: "CHURNED" } } },
    orderBy: [{ client: { companyName: "asc" } }, { label: "asc" }],
    select: credentialSelect,
  });
}

export type CredentialListItem = Awaited<ReturnType<typeof listCredentialsForClient>>[number];
