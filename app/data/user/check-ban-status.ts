import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export async function checkBanStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      banned: true,
      banExpires: true,
    },
  });

  if (!user?.banned) {
    return false;
  }

  // Check if ban has expired
  if (user.banExpires && new Date() > user.banExpires) {
    // Auto-unban expired bans
    await prisma.user.update({
      where: { id: userId },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });
    return false;
  }

  redirect("/banned");
}

export async function getBanInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      banned: true,
      banReason: true,
      banExpires: true,
    },
  });

  return {
    banned: user?.banned ?? false,
    reason: user?.banReason ?? "Vi phạm quy định cộng đồng",
    expires: user?.banExpires ?? null,
  };
}
