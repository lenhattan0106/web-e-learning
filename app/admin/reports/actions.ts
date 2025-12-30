"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";

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

// Delete comment permanently
export async function deleteReportedComment(idBinhLuan: string): Promise<ApiResponse> {
  await requireAdmin();

  try {
    // Hard delete the comment (cascades to reports)
    await prisma.binhLuan.delete({
      where: { id: idBinhLuan },
    });

    revalidatePath("/admin/reports");
    return { status: "success", message: "Đã xóa bình luận" };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { status: "error", message: "Không thể xóa bình luận" };
  }
}

// Delete comment and ban user
export async function deleteAndBanUser(
  idBinhLuan: string,
  idNguoiDung: string,
  banReason: string = "Vi phạm quy định bình luận"
): Promise<ApiResponse> {
  await requireAdmin();

  try {
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
        banExpires: null, // Permanent ban
      },
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/users");
    return { status: "success", message: "Đã xóa bình luận và cấm người dùng" };
  } catch (error) {
    console.error("Error banning user:", error);
    return { status: "error", message: "Không thể xử lý yêu cầu" };
  }
}

// Mark reports as processed without action
export async function markReportsProcessed(idBinhLuan: string): Promise<ApiResponse> {
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
