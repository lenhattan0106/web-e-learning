"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  sendNotification,
  NOTIFICATION_TEMPLATES,
} from "@/app/services/notification-service";
import { triggerUserNotification } from "@/lib/pusher";

// 1. Chặn khóa học (Ban Course) - Direct action (không qua báo cáo)
export async function banCourse(courseId: string, reason: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  // Update status
  const course = await prisma.khoaHoc.update({
    where: { id: courseId },
    data: {
      trangThai: "BiChan",
    },
    select: { idNguoiDung: true, tenKhoaHoc: true },
  });

  // Notify Teacher
  await prisma.thongBao.create({
    data: {
      tieuDe: "Khóa học bị khóa",
      noiDung: `Khóa học "${course.tenKhoaHoc}" của bạn đã bị khóa. Lý do: ${reason}`,
      loai: "KIEM_DUYET",
      idNguoiDung: course.idNguoiDung,
      metadata: { courseId },
    },
  });

  // Ghi Nhật ký xử lý (Direct ban - không qua báo cáo nên không có idBaoCao)
  await prisma.nhatKyXuLy.create({
    data: {
      idAdmin: session.user.id,
      loaiBaoCao: "KHOA_HOC",
      hanhDong: "CHAN_KHOA_HOC",
      lyDoXuLy: `[Direct Ban] Khóa học: ${course.tenKhoaHoc} - Lý do: ${reason}`,
    },
  });

  revalidatePath("/admin/quality-control");
  revalidatePath("/courses");
  return { success: true };
}

// 2. Xử lý báo cáo khóa học
export async function resolveCourseReport(reportId: string, action: "BAN" | "IGNORE") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const report = await prisma.baoCaoKhoaHoc.findUnique({
    where: { id: reportId },
    include: { khoaHoc: true },
  });

  if (!report) throw new Error("Report not found");

  if (action === "BAN") {
    // Block course
    await prisma.khoaHoc.update({
      where: { id: report.idKhoaHoc },
      data: { trangThai: "BiChan" },
    });
    
    // Notify Teacher
    await prisma.thongBao.create({
      data: {
        tieuDe: "Khóa học bị khóa do báo cáo",
        noiDung: `Khóa học "${report.khoaHoc.tenKhoaHoc}" đã bị khóa do vi phạm chính sách.`,
        loai: "KIEM_DUYET",
        idNguoiDung: report.khoaHoc.idNguoiDung,
        metadata: { courseId: report.idKhoaHoc },
      },
    });
  }

  // Update report status
  await prisma.baoCaoKhoaHoc.update({
    where: { id: reportId },
    data: { trangThai: action === "BAN" ? "DaXuLy" : "TuChoi" },
  });

  // Ghi Nhật ký xử lý
  await prisma.nhatKyXuLy.create({
    data: {
      idAdmin: session.user.id,
      loaiBaoCao: "KHOA_HOC",
      idBaoCaoKhoaHoc: reportId,
      hanhDong: action === "BAN" ? "CHAN_KHOA_HOC" : "BO_QUA",
      lyDoXuLy: action === "BAN" ? `Khóa học vi phạm: ${report.khoaHoc.tenKhoaHoc}` : "Không vi phạm",
    },
  });

  revalidatePath("/admin/quality-control");
  return { success: true };
}

// 3. Xử lý báo cáo bình luận
export async function resolveCommentReport(reportId: string, action: "DELETE" | "IGNORE") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const report = await prisma.baoCaoBinhLuan.findUnique({
    where: { id: reportId },
    include: { binhLuan: true },
  });

  if (!report) throw new Error("Report not found");

  if (action === "DELETE") {
    // Soft delete comment
    await prisma.binhLuan.update({
      where: { id: report.idBinhLuan },
      data: { trangThai: "DA_XOA" },
    });

    // Notify User
    await prisma.thongBao.create({
      data: {
        tieuDe: "Bình luận bị xóa",
        noiDung: "Bình luận của bạn đã bị xóa do vi phạm tiêu chuẩn cộng đồng.",
        loai: "KIEM_DUYET",
        idNguoiDung: report.binhLuan.idNguoiDung,
      },
    });
  }

  await prisma.baoCaoBinhLuan.update({
    where: { id: reportId },
    data: { trangThai: action === "DELETE" ? "DaXuLy" : "TuChoi" },
  });

  // Ghi Nhật ký xử lý
  await prisma.nhatKyXuLy.create({
    data: {
      idAdmin: session.user.id,
      loaiBaoCao: "BINH_LUAN",
      idBaoCaoBinhLuan: reportId,
      hanhDong: action === "DELETE" ? "XOA_NOI_DUNG" : "BO_QUA",
      lyDoXuLy: action === "DELETE" ? "Vi phạm tiêu chuẩn cộng đồng" : "Không vi phạm",
    },
  });

  revalidatePath("/admin/quality-control");
  revalidatePath("/admin/activity-logs");
  return { success: true };
}

// ============================================
// 4. Xử lý báo cáo bình luận + Cấm người dùng
// ============================================
function calculateBanDays(banExpires: Date | null | undefined): number | null {
  if (!banExpires) return null;
  const now = new Date();
  const diffMs = banExpires.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export async function resolveCommentReportWithBan(
  reportId: string,
  banReason: string,
  banDays: number | null // null = vĩnh viễn
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const report = await prisma.baoCaoBinhLuan.findUnique({
    where: { id: reportId },
    include: {
      binhLuan: {
        include: {
          nguoiDung: { select: { id: true, name: true } },
          baiHoc: {
            include: {
              chuong: {
                include: {
                  khoaHoc: { select: { tenKhoaHoc: true, duongDan: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!report) throw new Error("Report not found");

  const userId = report.binhLuan.idNguoiDung;
  const banExpires = banDays ? new Date(Date.now() + banDays * 24 * 60 * 60 * 1000) : null;

  // 1. Soft delete comment
  await prisma.binhLuan.update({
    where: { id: report.idBinhLuan },
    data: { trangThai: "DA_XOA" },
  });

  // 2. Ban the user
  await prisma.user.update({
    where: { id: userId },
    data: {
      banned: true,
      banReason,
      banExpires,
    },
  });

  // 3. Update report status
  await prisma.baoCaoBinhLuan.update({
    where: { id: reportId },
    data: { trangThai: "DaXuLy" },
  });

  // 4. Ghi Nhật ký xử lý (Audit Trail)
  await prisma.nhatKyXuLy.create({
    data: {
      idAdmin: session.user.id,
      loaiBaoCao: "BINH_LUAN",
      idBaoCaoBinhLuan: reportId,
      hanhDong: "CAM_USER",
      lyDoXuLy: banReason,
      thoiHanCam: calculateBanDays(banExpires),
    },
  });

  // 5. Gửi thông báo cho user bị cấm
  const banTemplate = NOTIFICATION_TEMPLATES.USER_BANNED(banReason, banExpires);
  await sendNotification({
    userId,
    title: banTemplate.title,
    message: banTemplate.message,
    type: "KIEM_DUYET",
    metadata: {
      banReason,
      banExpires: banExpires?.toISOString() || null,
      commentId: report.idBinhLuan,
    },
  });

  // 6. Real-time ban notification via Pusher
  await triggerUserNotification(userId, "user-banned", {
    reason: banReason,
    expiresAt: banExpires?.toISOString() || null,
    bannedAt: new Date().toISOString(),
  });

  revalidatePath("/admin/quality-control");
  revalidatePath("/admin/users");
  revalidatePath("/admin/activity-logs");
  
  return { 
    success: true, 
    message: banExpires 
      ? `Đã xóa bình luận và cấm ${report.binhLuan.nguoiDung.name} đến ${banExpires.toLocaleDateString("vi-VN")}`
      : `Đã xóa bình luận và cấm ${report.binhLuan.nguoiDung.name} vĩnh viễn`
  };
}
