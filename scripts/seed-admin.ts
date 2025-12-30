/**
 * Seed Admin Account using better-auth's internal API
 * This ensures the password is hashed correctly using better-auth's method
 */
import { auth } from "../lib/auth";
import { prisma } from "../lib/db";

const ADMIN_EMAIL = "admin@nt-elearning.com";
const ADMIN_PASSWORD = "Admin@123";  // Min 8 chars required by better-auth
const ADMIN_NAME = "Administrator";


async function main() {
  console.log("🌱 Starting seed with better-auth API...");

  // Delete existing admin account first
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin) {
    // Delete sessions, accounts first (due to FK constraints)
    await prisma.session.deleteMany({ where: { userId: existingAdmin.id } });
    await prisma.account.deleteMany({ where: { userId: existingAdmin.id } });
    await prisma.user.delete({ where: { id: existingAdmin.id } });
    console.log("✅ Deleted existing admin account");
  }

  try {
    // Use better-auth's signUp.email to create user with proper password hashing
    const result = await auth.api.signUpEmail({
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: ADMIN_NAME,
      },
    });

    if (result.user) {
      // Update role to admin
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { 
          role: "admin",
          emailVerified: true  // Skip email verification for admin
        }
      });
      
      console.log("✅ Admin account created via better-auth API!");
      console.log(`
  ┌─────────────────────────────────────────┐
  │  Admin Account Created Successfully!    │
  ├─────────────────────────────────────────┤
  │  Email:    ${ADMIN_EMAIL.padEnd(25)}   │
  │  Password: ${ADMIN_PASSWORD.padEnd(25)}   │
  │  Role:     admin                        │
  │  Method:   better-auth signUpEmail      │
  └─────────────────────────────────────────┘
      `);
    } else {
      console.error("❌ Failed to create admin:", result);
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
