"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/app/services/notification-service";
import { triggerUserNotification } from "@/lib/pusher";
// Ban user - kick immediately by clearing sessions
export async function banUser(
  userId: string, 
  reason: string, 
  expiresAt?: Date | null
) {
  await requireAdmin();
  
  try {
    await prisma.$transaction([
      // Update user ban status
      prisma.user.update({
        where: { id: userId },
        data: {
          banned: true,
          banReason: reason,
          banExpires: expiresAt || null // null = permanent
        }
      }),
      // Clear all sessions - immediate logout
      prisma.session.deleteMany({ 
        where: { userId } 
      })
    ]);
    
    revalidatePath("/admin/users");
    return { success: true, message: "Đã cấm người dùng thành công" };
  } catch (error) {
    console.error("Ban user error:", error);
    return { success: false, message: "Có lỗi xảy ra khi cấm người dùng" };
  }
}


export async function unbanUser(userId: string) {
  await requireAdmin();
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        banned: false,
        banReason: null,
        banExpires: null
      }
    });

    // Notify user - Persistent & Realtime
    await sendNotification({
      userId,
      title: "Tài khoản của bạn đã được mở khóa",
      message: "Tài khoản của bạn đã được quản trị viên mở khóa. Bạn có thể truy cập lại bình thường.",
      type: "HE_THONG"
    });
    await triggerUserNotification(userId, "user:unbanned", {
       message: "Tài khoản của bạn đã được mở khóa!"
    });
    
    revalidatePath("/admin/users");
    return { success: true, message: "Đã bỏ cấm người dùng thành công" };
  } catch (error) {
    console.error("Unban user error:", error);
    return { success: false, message: "Có lỗi xảy ra khi bỏ cấm người dùng" };
  }
}



// Change user role
export async function changeUserRole(
  userId: string, 
  newRole: "user" | "teacher"
) {
  await requireAdmin();
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });
    
    revalidatePath("/admin/users");
    return { 
      success: true, 
      message: `Đã đổi vai trò thành ${newRole === "teacher" ? "Giáo viên" : "Học viên"}` 
    };
  } catch (error) {
    console.error("Change role error:", error);
    return { success: false, message: "Có lỗi xảy ra khi đổi vai trò" };
  }
}

export async function grantPremium(userId: string, days: number = 30) {
  await requireAdmin();
  
  try {
    const now = new Date();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumExpires: true }
    });
    
    if (!user) {
      return { success: false, message: "Không tìm thấy người dùng" };
    }
    
    // If currently premium and not expired, extend from expiry date
    // Otherwise start from now
    const startDate = (user.isPremium && user.premiumExpires && user.premiumExpires > now) 
      ? user.premiumExpires 
      : now;
    
    const newExpiry = new Date(startDate);
    newExpiry.setDate(newExpiry.getDate() + days);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumExpires: newExpiry
      }
    });
    
    revalidatePath("/admin/users");
    return { 
      success: true, 
      message: `Đã cấp ${days} ngày Premium. Hết hạn: ${newExpiry.toLocaleDateString('vi-VN')}`,
      newExpiry
    };
  } catch (error) {
    console.error("Grant premium error:", error);
    return { success: false, message: "Có lỗi xảy ra khi cấp Premium" };
  }
}

// Revoke premium
export async function revokePremium(userId: string) {
  await requireAdmin();
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: false,
        premiumExpires: null
      }
    });
    
    revalidatePath("/admin/users");
    return { success: true, message: "Đã thu hồi quyền Premium" };
  } catch (error) {
    console.error("Revoke premium error:", error);
    return { success: false, message: "Có lỗi xảy ra khi thu hồi Premium" };
  }
}
// Grant premium by email
export async function grantPremiumByEmail(email: string, days: number = 30) {
  await requireAdmin();
  
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    
    if (!user) {
      return { success: false, message: "Không tìm thấy người dùng với email này" };
    }
    
    return await grantPremium(user.id, days);
  } catch (error) {
    console.error("Grant premium by email error:", error);
    return { success: false, message: "Có lỗi xảy ra khi cấp Premium" };
  }
}
