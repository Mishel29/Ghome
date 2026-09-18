import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { prisma } from "../lib/prisma.js";

function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!email || !password) {
    console.error("Admin bootstrap requires ADMIN_EMAIL and ADMIN_PASSWORD.");
    process.exitCode = 1;
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    console.error("ADMIN_EMAIL must be a valid email address.");
    process.exitCode = 1;
  } else if (password.length < 12 || password.length > 128) {
    console.error("ADMIN_PASSWORD must be 12 to 128 characters.");
    process.exitCode = 1;
  } else {
    try {
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
      if (existing) {
        console.log(`Admin bootstrap skipped: ${email} already exists with role ${existing.role}.`);
      } else {
        const admin = await prisma.user.create({ data: { name: "Harborstone Administrator", email, passwordHash: passwordHash(password), role: "ADMIN" } });
        console.log(`Admin bootstrap succeeded: created ${admin.email}.`);
      }
    } catch (error) {
      console.error(`Admin bootstrap failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  }
}

void main();
