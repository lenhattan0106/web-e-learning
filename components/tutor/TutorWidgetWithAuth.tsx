import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { TutorWidget } from "./TutorWidget";

export async function TutorWidgetWithAuth() {
  let isPremium = false;
  let premiumExpires: Date | null = null;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          isPremium: true,
          premiumExpires: true,
        },
      });

      if (user) {
        const now = new Date();
        isPremium = Boolean(user.isPremium && user.premiumExpires && user.premiumExpires > now);
        premiumExpires = user.premiumExpires;
      }
    }
  } catch (error) {
    console.error("Error fetching premium status:", error);
  }

  return <TutorWidget isPremium={isPremium} premiumExpires={premiumExpires} />;
}
