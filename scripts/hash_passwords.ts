import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

async function updatePasswords() {
  console.log('Starting password update...');
  
  // Get all users
  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} users to update`);

  // Update each user's password
  for (const user of allUsers) {
    try {
      // Only hash if the password doesn't contain a salt (not already hashed)
      if (!user.password.includes('.')) {
        const hashedPassword = await hashPassword(user.password);
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        console.log(`Updated password for user ${user.email}`);
      } else {
        console.log(`Password for ${user.email} is already hashed, skipping`);
      }
    } catch (error) {
      console.error(`Failed to update password for ${user.email}:`, error);
    }
  }
  
  console.log('Password update completed');
}

// Run the update
updatePasswords().then(() => process.exit(0)).catch(console.error);
