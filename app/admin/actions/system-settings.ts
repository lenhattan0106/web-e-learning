"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SYSTEM_SETTINGS } from "@/app/data/admin/system-settings-constants";
import { notifyAllUsers } from "@/app/services/notification-service";



export async function getSystemSetting(key: string, defaultValue: string = "") {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value || defaultValue;
  } catch (error) {
    console.error(`Error getting system setting ${key}:`, error);
    return defaultValue;
  }
}

export async function updateSystemSetting(key: string, value: string) {
  try {
    const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { 
            key, 
            value,
            moTa: key === SYSTEM_SETTINGS.PREMIUM_MONTHLY_PRICE ? "Giá gói Premium hàng tháng (VND)" : undefined
        },
    });
    
    if (key === SYSTEM_SETTINGS.PREMIUM_MONTHLY_PRICE) {
      const formattedPrice = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(parseInt(value));
      await notifyAllUsers({
        title: "Cập nhật giá gói AI Premium",
        message: `Giá gói Premium đã được cập nhật thành ${formattedPrice}. Nâng cấp ngay để trải nghiệm các tính năng AI mới nhất!`,
        type: "HE_THONG",
        metadata: { url: "/pricing" } 
      });
    }

    revalidatePath("/admin/premium");
    
    return { success: true, data: setting, message: "Cập nhật cấu hình thành công" };
  } catch (error) {
    console.error(`Error updating system setting ${key}:`, error);
    return { success: false, message: "Có lỗi xảy ra khi cập nhật cấu hình" };
  }
}


export async function getPremiumPrice(): Promise<number> {
    const priceStr = await getSystemSetting(SYSTEM_SETTINGS.PREMIUM_MONTHLY_PRICE, "99000");
    const price = parseInt(priceStr, 10);
    return isNaN(price) ? 99000 : price;
}
