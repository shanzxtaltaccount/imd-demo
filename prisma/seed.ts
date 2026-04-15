/**
 * Run with: npm run db:seed
 * Creates initial users for the IMD Store Log System.
 * Change passwords before running in production!
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USERS = [
  {
    email: "admin@imd.gov.in",
    name: "IMD Administrator",
    password: "Admin@IMD2024",
    role: "ADMIN" as const,
  },
  {
    email: "store.officer@imd.gov.in",
    name: "Store Officer",
    password: "Store@2024",
    role: "STAFF" as const,
  },
  {
    email: "assistant@imd.gov.in",
    name: "Store Assistant",
    password: "Asst@2024",
    role: "STAFF" as const,
  },
];

async function main() {
  console.log("Seeding users...");

  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
      },
    });
    console.log(`✓ ${created.email} (${created.role})`);
  }

  console.log("\nDone! Change passwords immediately after first login.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
