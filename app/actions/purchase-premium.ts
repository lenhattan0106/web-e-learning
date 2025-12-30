"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { vnpay } from "@/lib/vnpay";
import { ProductCode, VnpLocale } from "vnpay";
import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const PREMIUM_PRICE = 99000; // 99k VND
const PREMIUM_DAYS = 30;

export async function purchasePremiumAction() {
  const user = await requireUser();
  let paymentUrl = "";

  try {
    // Check if already has active premium
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isPremium: true, premiumExpires: true }
    });

    const now = new Date();
    const isActivePremium = currentUser?.isPremium && 
      currentUser.premiumExpires && 
      currentUser.premiumExpires > now;

    // Create ThanhToanPremium record
    const payment = await prisma.thanhToanPremium.create({
      data: {
        idNguoiDung: user.id,
        soTien: PREMIUM_PRICE,
        soNgay: PREMIUM_DAYS,
        trangThai: "DangXuLy"
      }
    });

    // Get IP address
    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";

    // Build VNPay URL with PREMIUM_ prefix to distinguish from course payments
    paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: PREMIUM_PRICE,
      vnp_TxnRef: `PREMIUM_${payment.id}`,
      vnp_OrderInfo: isActivePremium 
        ? "Gia han goi AI Pro 30 ngay" 
        : "Nang cap goi AI Pro 30 ngay",
      vnp_OrderType: ProductCode.Other,
      vnp_IpAddr: clientIP,
      vnp_Locale: VnpLocale.VN,
      vnp_ReturnUrl: env.VNPAY_RETURN_URL || "http://localhost:3000/payment/return"
    });

    console.log("Created premium payment:", payment.id);
  } catch (error) {
    console.error("Error creating premium payment:", error);
    return {
      status: "error",
      message: "Đã xảy ra lỗi khi xử lý thanh toán. Vui lòng thử lại."
    };
  }

  redirect(paymentUrl);
}

// Get current premium status
export async function getPremiumStatus() {
  const user = await requireUser();
  
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { 
      isPremium: true, 
      premiumExpires: true 
    }
  });

  if (!currentUser) {
    return { isPremium: false, expiresAt: null, daysRemaining: 0 };
  }

  const now = new Date();
  const isActive = currentUser.isPremium && 
    currentUser.premiumExpires && 
    currentUser.premiumExpires > now;

  const daysRemaining = isActive && currentUser.premiumExpires
    ? Math.ceil((currentUser.premiumExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isPremium: isActive,
    expiresAt: currentUser.premiumExpires,
    daysRemaining
  };
}
