import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seeds (or updates) the first Owner account.
// Configure via .env: OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME.
// Run with:  npm run seed

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.OWNER_EMAIL ?? "owner@gsdhq.local").toLowerCase();
  const password = process.env.OWNER_PASSWORD ?? "gsd-change-me-now";
  const name = process.env.OWNER_NAME ?? "GSD Owner";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "OWNER", isActive: true, name },
    create: { email, name, role: "OWNER", passwordHash },
  });

  console.log(`\n✔ Owner ready: ${user.email}  (role: ${user.role})`);
  console.log(`  Sign in with the OWNER_PASSWORD from your .env, then change it.\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
