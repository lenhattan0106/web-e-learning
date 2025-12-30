import { PrismaClient } from "@prisma/client";
import { scryptSync, timingSafeEqual } from "crypto";

const prisma = new PrismaClient();

/**
 * Verify password using the same method as better-auth
 */
function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    const hashBuffer = Buffer.from(hash, "hex");
    const derivedHash = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuffer, derivedHash);
  } catch (e) {
    console.error("Verify error:", e);
    return false;
  }
}

async function main() {
  // Get admin account
  const admin = await prisma.account.findFirst({
    where: { 
      providerId: "credential",
      user: { email: "admin@nt-elearning.com" }
    },
    include: { user: true }
  });
  
  if (admin?.password) {
    console.log("Testing admin password verification...");
    console.log("Stored hash:", admin.password.substring(0, 50) + "...");
    
    const isValid = verifyPassword("123456", admin.password);
    console.log("Password '123456' is valid:", isValid);
  }
  
  // Test with a real user account
  const other = await prisma.account.findFirst({
    where: { 
      providerId: "credential",
      NOT: { user: { email: "admin@nt-elearning.com" } }
    },
    include: { user: true }
  });
  
  if (other?.password) {
    console.log("\nComparing hash formats:");
    console.log("Admin hash:", admin?.password?.substring(0, 40));
    console.log("Other hash:", other.password?.substring(0, 40));
    console.log("\nBoth have same format:", 
      admin?.password?.includes(":") === other.password?.includes(":") &&
      admin?.password?.length === other.password?.length
    );
  }
}

main().finally(() => prisma.$disconnect());
