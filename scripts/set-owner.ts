import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Update the EXISTING Owner account in place (unlike seed-owner.ts, which
// upserts by email and never rotates an existing password). Set any of
// OWNER_NAME / OWNER_EMAIL / OWNER_PASSWORD — only the ones provided change.
//
//   OWNER_NAME="Jane Doe" OWNER_EMAIL="jane@x.com" OWNER_PASSWORD="secret" \
//     npx tsx scripts/set-owner.ts
//
// On the live Pi:  sudo docker compose exec \
//     -e OWNER_NAME="..." -e OWNER_EMAIL="..." -e OWNER_PASSWORD="..." \
//     web npx tsx scripts/set-owner.ts

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const name = process.env.OWNER_NAME?.trim();
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;

  // Target the (oldest) OWNER-role user.
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER" },
    orderBy: { createdAt: "asc" },
  });
  if (!owner) throw new Error("No OWNER-role user found to update.");

  const data: { name?: string; email?: string; passwordHash?: string } = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);
  if (Object.keys(data).length === 0) {
    throw new Error(
      "Nothing to change — set OWNER_NAME and/or OWNER_EMAIL and/or OWNER_PASSWORD.",
    );
  }

  const updated = await prisma.user.update({
    where: { id: owner.id },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  const changed = Object.keys(data).join(", ");
  console.log(`✔ Owner updated (${changed}): ${updated.name} <${updated.email}> [${updated.role}]`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("set-owner failed:", e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
