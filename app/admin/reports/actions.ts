"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";
import {
  sendNotification,
  NOTIFICATION_TEMPLATES,
} from "@/app/services/notification-service";
import { triggerUserNotification } from "@/lib/pusher";

// ============================================
// HELPER: Calculate ban days for audit log
// ============================================
function calculateBanDays(banExpires: Date | null | undefined): number | null {
  if (!banExpires) return null; // Vĩnh viễn
  const now = new Date();
  const diffMs = banExpires.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================
// 1. Approve Comment - Phê duyệt bình luận (bỏ qua báo cáo)
// ============================================
export async function approveComment(idBinhLuan: string): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    // Lấy thông tin báo cáo đầu tiên để ghi log
    const firstReport = await prisma.baoCaoBinhLuan.findFirst({
      where: { idBinhLuan, trangThai: "ChoXuLy" },
      select: { id: true },
    });

    // Mark all reports as rejected
    await prisma.baoCaoBinhLuan.updateMany({
      where: { idBinhLuan, trangThai: "ChoXuLy" },
      data: { trangThai: "TuChoi" },
    });

    // Make comment visible again
    await prisma.binhLuan.update({
      where: { id: idBinhLuan },
      data: { trangThai: "HIEN" },
    });

    // 📝 Ghi Nhật ký xử lý (Audit Trail)
    await prisma.nhatKyXuLy.create({
      data: {
        idAdmin: session.user.id,
        loaiBaoCao: "BINH_LUAN",
        idBaoCaoBinhLuan: firstReport?.id || null,
        hanhDong: "BO_QUA",
        lyDoXuLy: "Phê duyệt: Bình luận không vi phạm tiêu chuẩn cộng đồng",
      },
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/activity-logs");
    return { status: "success", message: "Đã phê duyệt bình luận" };
  } catch (error) {
    console.error("Error approving comment:", error);
    return { status: "error", message: "Không thể phê duyệt bình luận" };
  }
}

// ============================================
// 2. Delete Reported Comment - Xóa bình luận vi phạm
// ============================================
export async function deleteReportedComment(
  idBinhLuan: string
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    // Get comment data before deletion
    const comment = await prisma.binhLuan.findUnique({
      where: { id: idBinhLuan },
      include: {
        baiHoc: {
          include: {
            chuong: {
              include: {
                khoaHoc: {
                  select: { id: true, tenKhoaHoc: true, duongDan: true },
                },
              },
            },
          },
        },
        baoCaos: {
          where: { trangThai: "ChoXuLy" },
          take: 1,
          select: { id: true, lyDo: true },
        },
      },
    });

    if (!comment) {
      return { status: "error", message: "Không tìm thấy bình luận" };
    }

    const khoaHoc = comment.baiHoc.chuong.khoaHoc;
    const reportReason = comment.baoCaos[0]?.lyDo || "Vi phạm quy định cộng đồng";
    const reportId = comment.baoCaos[0]?.id;
    const commentAuthorId = comment.idNguoiDung;

    // Delete the comment (cascades to reports)
    await prisma.binhLuan.delete({
      where: { id: idBinhLuan },
    });

    // 📝 Ghi Nhật ký xử lý (Audit Trail)
    await prisma.nhatKyXuLy.create({
      data: {
        idAdmin: session.user.id,
        loaiBaoCao: "BINH_LUAN",
        idBaoCaoBinhLuan: reportId || null,
        hanhDong: "XOA_NOI_DUNG",
        lyDoXuLy: `Xóa bình luận: ${reportReason}`,
      },
    });

    // Send notification to comment author
    const template = NOTIFICATION_TEMPLATES.COMMENT_DELETED(khoaHoc.tenKhoaHoc, reportReason);
    await sendNotification({
      userId: commentAuthorId,
      title: template.title,
      message: template.message,
      type: "KIEM_DUYET",
      metadata: {
        url: `/courses/${khoaHoc.duongDan}`,
        courseId: khoaHoc.id,
        lessonId: comment.idBaiHoc,
      },
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/activity-logs");
    return { status: "success", message: "Đã xóa bình luận và gửi thông báo" };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { status: "error", message: "Không thể xóa bình luận" };
  }
}

// ============================================
// 3. Delete Comment & Ban User - Xóa bình luận và cấm người dùng
// ============================================
export async function deleteAndBanUser(
  idBinhLuan: string,
  idNguoiDung: string,
  banReason: string = "Vi phạm quy định bình luận",
  banExpires?: Date | null // null = permanent, Date = temporary
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    // Get comment + report info
    const comment = await prisma.binhLuan.findUnique({
      where: { id: idBinhLuan },
      include: {
        baiHoc: {
          include: {
            chuong: {
              include: {
                khoaHoc: {
                  select: { id: true, tenKhoaHoc: true, duongDan: true },
                },
              },
            },
          },
        },
        baoCaos: {
          where: { trangThai: "ChoXuLy" },
          take: 1,
          select: { id: true },
        },
      },
    });

    const khoaHoc = comment?.baiHoc.chuong.khoaHoc;
    const reportId = comment?.baoCaos[0]?.id;

    // Delete the comment
    await prisma.binhLuan.delete({
      where: { id: idBinhLuan },
    });

    // Ban the user (với session security - idAdmin từ server)
    await prisma.user.update({
      where: { id: idNguoiDung },
      data: {
        banned: true,
        banReason,
        banExpires: banExpires === undefined ? null : banExpires,
      },
    });

    // 📝 Ghi Nhật ký xử lý (Audit Trail) với thời hạn cấm
    await prisma.nhatKyXuLy.create({
      data: {
        idAdmin: session.user.id,
        loaiBaoCao: "BINH_LUAN",
        idBaoCaoBinhLuan: reportId || null,
        hanhDong: "CAM_USER",
        lyDoXuLy: banReason,
        thoiHanCam: calculateBanDays(banExpires),
      },
    });

    // Send BAN notification to user
    const banTemplate = NOTIFICATION_TEMPLATES.USER_BANNED(
      banReason,
      banExpires || null
    );
    await sendNotification({
      userId: idNguoiDung,
      title: banTemplate.title,
      message: banTemplate.message,
      type: "KIEM_DUYET",
      metadata: {
        banReason,
        banExpires: banExpires?.toISOString() || null,
        commentId: idBinhLuan,
        courseId: khoaHoc?.id,
      },
    });

    // 🚀 Real-time Ban Notification via Pusher
    // Trigger event để client tự động signOut()
    await triggerUserNotification(idNguoiDung, "user-banned", {
      reason: banReason,
      expiresAt: banExpires?.toISOString() || null,
      bannedAt: new Date().toISOString(),
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/users");
    revalidatePath("/admin/activity-logs");

    const banMessage = banExpires
      ? `Đã xóa bình luận và cấm người dùng đến ${new Date(banExpires).toLocaleDateString("vi-VN")}`
      : "Đã xóa bình luận và cấm người dùng vĩnh viễn";

    return { status: "success", message: banMessage };
  } catch (error) {
    console.error("Error banning user:", error);
    return { status: "error", message: "Không thể xử lý yêu cầu" };
  }
}

// ============================================
// 4. Mark Reports Processed - Đánh dấu đã xử lý
// ============================================
export async function markReportsProcessed(
  idBinhLuan: string
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    // Lấy report đầu tiên để ghi log
    const firstReport = await prisma.baoCaoBinhLuan.findFirst({
      where: { idBinhLuan, trangThai: "ChoXuLy" },
      select: { id: true },
    });

    await prisma.baoCaoBinhLuan.updateMany({
      where: { idBinhLuan, trangThai: "ChoXuLy" },
      data: { trangThai: "DaXuLy" },
    });

    // 📝 Ghi Nhật ký xử lý
    await prisma.nhatKyXuLy.create({
      data: {
        idAdmin: session.user.id,
        loaiBaoCao: "BINH_LUAN",
        idBaoCaoBinhLuan: firstReport?.id || null,
        hanhDong: "BO_QUA",
        lyDoXuLy: "Đã đánh dấu xử lý (không có hành động cụ thể)",
      },
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/activity-logs");
    return { status: "success", message: "Đã đánh dấu đã xử lý" };
  } catch (error) {
    console.error("Error marking reports:", error);
    return { status: "error", message: "Không thể đánh dấu" };
  }
}
