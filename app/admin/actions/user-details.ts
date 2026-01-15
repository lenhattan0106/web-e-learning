"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  isPremium: boolean;
  premiumExpires: Date | null;
}

export async function getUserDetailsByDateRange(
  fromDateISO: string,
  toDateISO: string,
  type: "all" | "premium" = "all"
) {
  await requireAdmin();
  
  const fromDate = new Date(fromDateISO);
  const toDate = new Date(toDateISO);

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
      ...(type === "premium" && { isPremium: true }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      isPremium: true,
      premiumExpires: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}
