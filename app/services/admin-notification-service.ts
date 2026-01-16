import { prisma } from "@/lib/db";
import { LoaiThongBao } from "@/lib/generated/prisma";
import { triggerUserNotification } from "@/lib/pusher";
import { v4 as uuidv4 } from "uuid";

interface AdminNotifyProps {
  title: string;
  message: string;
  type: LoaiThongBao;
  path?: string; // Optional deep link path
  metadata?: Record<string, any>;
}

export async function notifyAdmins({
  title,
  message,
  type,
  path,
  metadata = {},
}: AdminNotifyProps) {
  try {
    // 1. Fetch all Admin IDs
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    if (admins.length === 0) return;

    // 2. Prepare data with explicit UUIDs
    const notifications = admins.map((admin) => ({
      id: uuidv4(),
      tieuDe: title,
      noiDung: message,
      loai: type,
      idNguoiDung: admin.id,
      metadata: { ...metadata, ...(path ? { path } : {}) },
      daXem: false,
      ngayTao: new Date(),
    }));

    // 3. Bulk Insert (DB)
    await prisma.thongBao.createMany({
      data: notifications,
    });

    // 4. Trigger Real-time Events (Pusher)
    await Promise.all(
      notifications.map((notification) =>
        triggerUserNotification(notification.idNguoiDung, "new-notification", {
          id: notification.id,
          title: notification.tieuDe,
          message: notification.noiDung,
          type: notification.loai,
          metadata: notification.metadata,
          createdAt: notification.ngayTao,
        })
      )
    );
    
  } catch (error) {
    console.error("Failed to notify admins:", error);
    // Don't throw error to prevent breaking the main flow
  }
}
