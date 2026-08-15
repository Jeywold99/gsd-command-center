import { PrismaClient } from "@/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Pass the database URL to the PostgreSQL adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Use a global variable to store the Prisma instance in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Export the client so we can use it anywhere in our app
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
