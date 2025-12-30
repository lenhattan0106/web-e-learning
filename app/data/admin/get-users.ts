import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";
import { Prisma } from "@prisma/client";

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: "all" | "user" | "teacher" | "admin";
  status?: "all" | "active" | "banned";
  premium?: "all" | "premium" | "free";
}

export async function getUsers({
  page = 1,
  limit = 20,
  search = "",
  role = "all",
  status = "all",
  premium = "all"
}: GetUsersParams = {}) {
  await requireAdmin();
  
  const now = new Date();
  const where: Prisma.UserWhereInput = {};
  
  // Search by name or email
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }
  
  // Filter by role
  if (role !== "all") {
    where.role = role;
  }
  
  // Filter by ban status
  if (status === "active") {
    where.banned = { not: true };
  } else if (status === "banned") {
    where.banned = true;
  }
  
  // Filter by premium status
  if (premium === "premium") {
    where.isPremium = true;
    where.premiumExpires = { gt: now };
  } else if (premium === "free") {
    where.OR = where.OR || [];
    // Free users: not premium OR premium expired
    where.AND = [
      {
        OR: [
          { isPremium: false },
          { isPremium: null },
          { premiumExpires: { lt: now } },
          { premiumExpires: null }
        ]
      }
    ];
  }
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        isPremium: true,
        premiumExpires: true,
        createdAt: true,
        _count: {
          select: {
            khoaHocs: true,
            dangKyHocs: {
              where: { trangThai: "DaThanhToan" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ]);
  
  return { 
    users: users.map(user => ({
      ...user,
      coursesCount: user._count.khoaHocs,
      enrollmentsCount: user._count.dangKyHocs,
      isPremiumActive: user.isPremium && user.premiumExpires && user.premiumExpires > now
    })),
    total, 
    totalPages: Math.ceil(total / limit),
    page,
    limit
  };
}

export type UserWithStats = Awaited<ReturnType<typeof getUsers>>["users"][number];
