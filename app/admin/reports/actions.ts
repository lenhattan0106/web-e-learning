"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";
import {
  sendNotification,
  NOTIFICATION_TEMPLATES,
} from "@/app/services/notification-service";

// Approve reports (mark as processed, keep comment visible)
export async function approveComment(idBinhLuan: string): Promise<ApiResponse> {
  await requireAdmin();

  try {
    // Mark all reports as processed (TuChoi - rejected reports)
    await prisma.baoCaoBinhLuan.updateMany({
      where: { idBinhLuan, trangThai: "ChoXuLy" },
      data: { trangThai: "TuChoi" },
    });

    // Make comment visible again
    await prisma.binhLuan.update({
      where: { id: idBinhLuan },
      data: { trangThai: "HIEN" },
    });

    revalidatePath("/admin/reports");
    return { status: "success", message: "Đã phê duyệt bình luận" };
  } catch (error) {
    console.error("Error approving comment:", error);
    return { status: "error", message: "Không thể phê duyệt bình luận" };
  }
}

// Delete comment permanently with notification
export async function deleteReportedComment(
  idBinhLuan: string
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    // Get comment data before deletion for notification
    const comment = await prisma.binhLuan.findUnique({
      where: { id: idBinhLuan },
      include: {
        baiHoc: {
          include: {
            chuong: {
              include: {
                khoaHoc: {
                  select: { tenKhoaHoc: true, duongDan: true },
                },
              },
            },
          },
        },
        baoCaos: {
          where: { trangThai: "ChoXuLy" },
          take: 1,
          select: { lyDo: true },
        },
      },
    });

    if (!comment) {
      return { status: "error", message: "Không tìm thấy bình luận" };
    }

    const courseName = comment.baiHoc.chuong.khoaHoc.tenKhoaHoc;
    const courseSlug = comment.baiHoc.chuong.khoaHoc.duongDan;
    const reportReason = comment.baoCaos[0]?.lyDo || "Vi phạm quy định cộng đồng";
    const commentAuthorId = comment.idNguoiDung;

    // Delete the comment (cascades to reports)
    await prisma.binhLuan.delete({
      where: { id: idBinhLuan },
    });

    // Send notification to comment author
    const template = NOTIFICATION_TEMPLATES.COMMENT_DELETED(courseName, reportReason);
    await sendNotification({
      userId: commentAuthorId,
      title: template.title,
      message: template.message,
      type: "KIEM_DUYET",
      metadata: {
        url: `/courses/${courseSlug}`,
        courseId: comment.idKhoaHoc,
        lessonId: comment.idBaiHoc,
      },
    });

    revalidatePath("/admin/reports");
    return { status: "success", message: "Đã xóa bình luận và gửi thông báo" };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { status: "error", message: "Không thể xóa bình luận" };
  }
}

// Delete comment and ban user with notification
export async function deleteAndBanUser(
  idBinhLuan: string,
  idNguoiDung: string,
  banReason: string = "Vi phạm quy định bình luận",
  banExpires?: Date | null // null = permanent, Date = temporary
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    // Get comment info for notification metadata
    const comment = await prisma.binhLuan.findUnique({
      where: { id: idBinhLuan },
      include: {
        baiHoc: {
          include: {
            chuong: {
              include: {
                khoaHoc: {
                  select: { tenKhoaHoc: true, duongDan: true },
                },
              },
            },
          },
        },
      },
    });

    // Delete the comment
    await prisma.binhLuan.delete({
      where: { id: idBinhLuan },
    });

    // Ban the user
    await prisma.user.update({
      where: { id: idNguoiDung },
      data: {
        banned: true,
        banReason,
        banExpires: banExpires === undefined ? null : banExpires,
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
        courseId: comment?.idKhoaHoc,
      },
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/users");

    const banMessage = banExpires
      ? `Đã xóa bình luận và cấm người dùng đến ${new Date(banExpires).toLocaleDateString("vi-VN")}`
      : "Đã xóa bình luận và cấm người dùng vĩnh viễn";

    return { status: "success", message: banMessage };
  } catch (error) {
    console.error("Error banning user:", error);
    return { status: "error", message: "Không thể xử lý yêu cầu" };
  }
}

// Mark reports as processed without action
export async function markReportsProcessed(
  idBinhLuan: string
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    await prisma.baoCaoBinhLuan.updateMany({
      where: { idBinhLuan, trangThai: "ChoXuLy" },
      data: { trangThai: "DaXuLy" },
    });

    revalidatePath("/admin/reports");
    return { status: "success", message: "Đã đánh dấu đã xử lý" };
  } catch (error) {
    console.error("Error marking reports:", error);
    return { status: "error", message: "Không thể đánh dấu" };
  }
}

