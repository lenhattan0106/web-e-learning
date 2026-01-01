"use server";

import { prisma } from "@/lib/db";

export async function checkEmailVerificationStatus(email: string) {
  if (!email) {
    return { verified: false, exists: false };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { emailVerified: true }
    });

    if (!user) {
      return { verified: false, exists: false };
    }

    return { verified: user.emailVerified, exists: true };
  } catch (error) {
    console.error("Error checking email verification:", error);
    return { verified: false, exists: false };
  }
}
