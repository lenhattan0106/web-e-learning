import "server-only";

import { prisma } from "@/lib/db";

export interface AIAccessResult {
  allowed: boolean;
  reason?: "NO_USER" | "BANNED" | "NO_PREMIUM";
  message?: string;
  expiresAt?: Date | null;
  daysRemaining?: number;
}

export async function checkAIAccess(userId: string): Promise<AIAccessResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      premiumExpires: true,
      banned: true
    }
  });
  
  if (!user) {
    return { 
      allowed: false, 
      reason: "NO_USER",
      message: "Không tìm thấy người dùng"
    };
  }
  
  if (user.banned) {
    return { 
      allowed: false, 
      reason: "BANNED",
      message: "Tài khoản của bạn đã bị khóa"
    };
  }
  
  const now = new Date();
  const isActive = user.isPremium && user.premiumExpires && user.premiumExpires > now;
  
  if (!isActive) {
    return { 
      allowed: false, 
      reason: "NO_PREMIUM",
      message: "Bạn cần nâng cấp gói AI Pro (99,000đ/tháng) để sử dụng tính năng Chat AI."
    };
  }
  
  const daysRemaining = Math.ceil(
    (user.premiumExpires!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return { 
    allowed: true,
    expiresAt: user.premiumExpires,
    daysRemaining
  };
}

/**
\ */
export async function getAIAccessStatus(userId: string): Promise<AIAccessResult> {
  return checkAIAccess(userId);
}
