import { PrismaClient } from "@/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Pass the database URL to the PostgreSQL adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// In development the client is kept on `global` so hot reloads don't open a
// new connection pool each time. It's stored with the PrismaClient class it
// came from: after `prisma generate` the regenerated module brings a new class,
// so we build a fresh client instead of reusing one that doesn't know the new
// schema (which used to fail with "Unknown field" until a dev-server restart).
const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  prismaClass?: typeof PrismaClient;
};

function makeClient() {
  const cached = globalForPrisma.prisma;
  if (cached && globalForPrisma.prismaClass === PrismaClient) return cached;
  if (cached) void cached.$disconnect().catch(() => {});
  return new PrismaClient({ adapter });
}

// Export the client so we can use it anywhere in our app
export const prisma = makeClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClass = PrismaClient;
}
