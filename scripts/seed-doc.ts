import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const root = process.env.STORAGE_DIR || path.join(process.cwd(), "storage", "uploads");
  await fs.mkdir(root, { recursive: true });
  const key = `${Date.now()}-seed.txt`;
  const content =
    "GSD SOP: How to onboard a new client.\n1. Send welcome email.\n2. Create project.\n";
  await fs.writeFile(path.join(root, key), content);

  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  const doc = await prisma.document.create({
    data: {
      name: "GSD-SOP-Onboarding.txt",
      storagePath: key,
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(content),
      category: "SOP",
      uploadedById: owner!.id,
    },
  });
  console.log("created doc", doc.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
