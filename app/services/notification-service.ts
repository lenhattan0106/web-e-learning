import { prisma } from "@/lib/db";
import { triggerUserNotification, triggerBatchNotification } from "@/lib/pusher";
import { LoaiThongBao, Prisma } from "@/lib/generated/prisma";

export type NotificationPayload = {
  userId: string;
  title: string;
  message: string;
  type: LoaiThongBao;
  metadata?: Prisma.InputJsonValue;
};

export type NotificationResponse = {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: LoaiThongBao;
  metadata: Prisma.JsonValue;
  ngayTao: Date;
};


export const NOTIFICATION_TEMPLATES = {

  COMMENT_DELETED: (courseName: string, reason: string) => ({
    title: "Bình luận của bạn đã bị xóa",
    message: `Bình luận của bạn tại khóa học "${courseName}" đã bị gỡ bỏ do vi phạm tiêu chuẩn cộng đồng.\n\nLý do: ${reason}`,
  }),

  USER_BANNED: (reason: string, expiresAt: Date | null) => ({
    title: "Tài khoản của bạn đã bị tạm khóa",
    message: expiresAt
      ? `Tài khoản của bạn đã bị tạm khóa đến ${expiresAt.toLocaleDateString("vi-VN")}.\n\nLý do: ${reason}`
      : `Tài khoản của bạn đã bị khóa vĩnh viễn.\n\nLý do: ${reason}`,
  }),

  CHAT_BANNED: (courseName: string) => ({
    title: "Bạn đã bị hạn chế quyền thảo luận",
    message: `Bạn đã bị tạm dừng quyền thảo luận trong khóa học "${courseName}" do vi phạm quy định của giảng viên.`,
  }),

  CHAT_UNBANNED: (courseName: string) => ({
    title: "Quyền thảo luận đã được khôi phục",
    message: `Quyền thảo luận của bạn trong khóa học "${courseName}" đã được khôi phục.`,
  }),

  ADMIN_REPORT_ALERT: (courseName: string, reportCount: number) => ({
    title: "Bình luận cần xem xét",
    message: `Một bình luận tại khóa học "${courseName}" đã bị ${reportCount} người báo cáo.`,
  }),

  COURSE_PUBLISHED: (courseName: string, teacherName: string) => ({
    title: "Khóa học mới vừa được xuất bản",
    message: `Khóa học "${courseName}" của giảng viên ${teacherName} vừa được xuất bản. Hãy khám phá ngay!`,
  }),

  COURSE_UPDATED: (courseName: string) => ({
    title: "Khóa học được cập nhật",
    message: `Khóa học "${courseName}" mà bạn đang học vừa được cập nhật nội dung mới.`,
  }),
  COURSE_ARCHIVED: (courseName: string) => ({
    title: "Khóa học tạm ngừng",
    message: `Khóa học "${courseName}" mà bạn đang học đã tạm thời bị ẩn bởi giảng viên, bạn vẫn có thể học bình thường.`,
  }),
};

export async function sendNotification({
  userId,
  title,
  message,
  type,
  metadata,
}: NotificationPayload): Promise<NotificationResponse> {
  // 1.Lưu vào database
  const notification = await prisma.thongBao.create({
    data: {
      idNguoiDung: userId,
      tieuDe: title,
      noiDung: message,
      loai: type,
      metadata: metadata ?? Prisma.JsonNull,
    },
  });

  // 2. Gửi thông báo real-time thông qua Pusher
  await triggerUserNotification(userId, "new-notification", {
    id: notification.id,
    title: notification.tieuDe,
    message: notification.noiDung,
    type: notification.loai,
    metadata: notification.metadata,
    createdAt: notification.ngayTao,
  });

  return {
    id: notification.id,
    tieuDe: notification.tieuDe,
    noiDung: notification.noiDung,
    loai: notification.loai,
    metadata: notification.metadata,
    ngayTao: notification.ngayTao,
  };
}


export async function notifyAdmins({
  title,
  message,
  metadata,
}: {
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  const notifications = await prisma.thongBao.createManyAndReturn({
    data: admins.map((admin) => ({
      idNguoiDung: admin.id,
      tieuDe: title,
      noiDung: message,
      loai: "HE_THONG" as LoaiThongBao,
      metadata: metadata ?? Prisma.JsonNull,
    })),
  });

  // Gửi thông báo real-time cho các admin thông qua Pusher
  await triggerBatchNotification(
    admins.map((a) => a.id),
    "new-notification",
    {
      title,
      message,
      type: "HE_THONG",
      metadata,
      createdAt: new Date(),
    }
  );

  return notifications;
}

export async function checkAndAlertAdminsForReport(
  commentId: string,
  threshold: number = 3
) {
  const reportCount = await prisma.baoCaoBinhLuan.count({
    where: {
      idBinhLuan: commentId,
      trangThai: "ChoXuLy",
    },
  });

  if (reportCount !== threshold) return;
  const comment = await prisma.binhLuan.findUnique({
    where: { id: commentId },
    include: {
      baiHoc: {
        include: {
          chuong: {
            include: {
              khoaHoc: {
                select: { tenKhoaHoc: true },
              },
            },
          },
        },
      },
    },
  });

  if (!comment) return;

  const courseName = comment.baiHoc.chuong.khoaHoc.tenKhoaHoc;
  const template = NOTIFICATION_TEMPLATES.ADMIN_REPORT_ALERT(courseName, threshold);

  await notifyAdmins({
    title: template.title,
    message: template.message,
    metadata: {
      url: "/admin/reports",
      commentId,
    },
  });
}

export async function notifyEnrolledStudents({
  courseId,
  title,
  message,
  metadata,
}: {
  courseId: string;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const enrollments = await prisma.dangKyHoc.findMany({
    where: {
      idKhoaHoc: courseId,
      trangThai: "DaThanhToan",
    },
    select: { idNguoiDung: true },
  });

  if (enrollments.length === 0) return;

  const userIds = enrollments.map((e) => e.idNguoiDung);

  // Tạo thông báo trong database
  await prisma.thongBao.createMany({
    data: userIds.map((userId) => ({
      idNguoiDung: userId,
      tieuDe: title,
      noiDung: message,
      loai: "KHOA_HOC" as LoaiThongBao,
      metadata: metadata ?? Prisma.JsonNull,
    })),
  });

  // Gửi thông báo real-time cho các học viên thông qua Pusher
  await triggerBatchNotification(userIds, "new-notification", {
    title,
    message,
    type: "KHOA_HOC",
    metadata,
    createdAt: new Date(),
  });
}

export async function notifyAllUsers({
  title,
  message,
  type = "HE_THONG",
  metadata,
}: {
  title: string;
  message: string;
  type?: LoaiThongBao;
  metadata?: Prisma.InputJsonValue;
}) {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) return;

  const userIds = users.map((u) => u.id);

  // Database
  await prisma.thongBao.createMany({
    data: userIds.map((userId) => ({
      idNguoiDung: userId,
      tieuDe: title,
      noiDung: message,
      loai: type,
      metadata: metadata ?? Prisma.JsonNull,
    })),
  });

  // Pusher
  await triggerBatchNotification(userIds, "new-notification", {
    title,
    message,
    type,
    metadata,
    createdAt: new Date(),
  });
}
