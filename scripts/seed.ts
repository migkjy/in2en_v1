import { db } from "../server/db";
import { englishLevels, ageGroups, users, branches } from "@shared/schema";
import { UserRole } from "@shared/schema";
import { randomBytes, scrypt as _scrypt } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

async function main() {
  try {
    // Create English Levels
    console.log("Creating English Levels...");
    const levels = [
      { name: "Beginner", description: "A1-A2 Level" },
      { name: "Intermediate", description: "B1-B2 Level" },
      { name: "Advanced", description: "C1-C2 Level" }
    ];
    await db.insert(englishLevels).values(levels);

    // Create Age Groups
    console.log("Creating Age Groups...");
    const groups = [
      { name: "Children", description: "Ages 7-12" },
      { name: "Teenagers", description: "Ages 13-17" },
      { name: "Adults", description: "Ages 18+" }
    ];
    await db.insert(ageGroups).values(groups);

    // Create Admin User
    console.log("Creating Admin User...");
    const hashedPassword = await hashPassword("admin123");
    await db.insert(users).values({
      email: "admin@in2english.com",
      name: "Admin User",
      password: hashedPassword,
      role: UserRole.ADMIN
    });

    // Create Initial Branch
    console.log("Creating Initial Branch...");
    await db.insert(branches).values({
      name: "Main Branch",
      address: "서울시 강남구",
      phone: "02-123-4567"
    });

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

main().catch(console.error);
