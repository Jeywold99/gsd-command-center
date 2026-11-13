import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Help someone who is locked out of a client portal:
//   - lost phone → clears their two-step setup (they scan a new QR next sign-in)
//   - forgot password → also sets a new temporary password
//
//   RESET_EMAIL="nathan@example.com" npx tsx scripts/portal-reset.ts
//   RESET_EMAIL="nathan@example.com" RESET_PASSWORD="new-temp-password" npx tsx scripts/portal-reset.ts
//
// On the live Pi:
//   sudo docker compose exec -e RESET_EMAIL="..." web npx tsx scripts/portal-reset.ts

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const email = process.env.RESET_EMAIL?.trim().toLowerCase();
  const password = process.env.RESET_PASSWORD;
  if (!email) throw new Error("Set RESET_EMAIL.");
  if (password && password.length < 12) throw new Error("RESET_PASSWORD must be at least 12 characters.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account for ${email}.`);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecret: null,
      totpEnabledAt: null,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
  });
  console.log(`Reset two-step verification for ${email}${password ? " and set a new password" : ""}.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
