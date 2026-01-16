"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { LoaiThongBao } from "@/lib/generated/prisma";

type NotificationItem = {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: LoaiThongBao;
  daXem: boolean;
  metadata: unknown;
  ngayTao: Date;
};

type GetNotificationsResponse = {
  notifications: NotificationItem[];
  nextCursor?: string;
  hasMore: boolean;
};

export async function getNotifications(
  cursor?: string,
  limit: number = 20
): Promise<GetNotificationsResponse> {
  const session = await requireUser();

  const notifications = await prisma.thongBao.findMany({
    where: { idNguoiDung: session.id },
    take: limit + 1, 
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { ngayTao: "desc" },
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, -1) : notifications;

  return {
    notifications: items.map((n) => ({
      id: n.id,
      tieuDe: n.tieuDe,
      noiDung: n.noiDung,
      loai: n.loai,
      daXem: n.daXem,
      metadata: n.metadata,
      ngayTao: n.ngayTao,
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    hasMore,
  };
}

/**
 * Lấy chỉ thông báo chưa đọc (dành cho dropdown)
 */
export async function getUnreadNotifications(
  limit: number = 5
): Promise<{ notifications: NotificationItem[] }> {
  const session = await requireUser();

  const notifications = await prisma.thongBao.findMany({
    where: { 
      idNguoiDung: session.id,
      daXem: false,
    },
    take: limit,
    orderBy: { ngayTao: "desc" },
  });

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      tieuDe: n.tieuDe,
      noiDung: n.noiDung,
      loai: n.loai,
      daXem: n.daXem,
      metadata: n.metadata,
      ngayTao: n.ngayTao,
    })),
  };
}

export async function markAsRead(notificationId: string) {
  const session = await requireUser();

  try {
    await prisma.thongBao.update({
      where: {
        id: notificationId,
        idNguoiDung: session.id, // Security: only owner can mark
      },
      data: { daXem: true },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Không thể cập nhật thông báo" };
  }
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export async function markAllAsRead() {
  const session = await requireUser();

  try {
    await prisma.thongBao.updateMany({
      where: {
        idNguoiDung: session.id,
        daXem: false,
      },
      data: { daXem: true },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Không thể cập nhật thông báo" };
  }
}

/**
 * Lấy số lượng thông báo chưa đọc
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  const session = await requireUser();

  const count = await prisma.thongBao.count({
    where: {
      idNguoiDung: session.id,
      daXem: false,
    },
  });

  return { count };
}

/**
 * Lấy thông báo theo loại (filter)
 */
export async function getNotificationsByType(
  type: LoaiThongBao,
  cursor?: string,
  limit: number = 20
): Promise<GetNotificationsResponse> {
  const session = await requireUser();

  const notifications = await prisma.thongBao.findMany({
    where: {
      idNguoiDung: session.id,
      loai: type,
    },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { ngayTao: "desc" },
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, -1) : notifications;

  return {
    notifications: items.map((n) => ({
      id: n.id,
      tieuDe: n.tieuDe,
      noiDung: n.noiDung,
      loai: n.loai,
      daXem: n.daXem,
      metadata: n.metadata,
      ngayTao: n.ngayTao,
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    hasMore,
  };
}

/**
 * Xóa một thông báo
 */
export async function deleteNotification(notificationId: string) {
  const session = await requireUser();

  try {
    await prisma.thongBao.delete({
      where: {
        id: notificationId,
        idNguoiDung: session.id, // Security: only owner can delete
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Không thể xóa thông báo" };
  }
}
