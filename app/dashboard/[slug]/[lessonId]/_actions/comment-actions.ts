"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import aj, { slidingWindow } from "@/lib/arcjet";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { notifyAdmins } from "@/app/services/admin-notification-service";
import { sendNotification } from "@/app/services/notification-service";

// Rate limit: 3 comments per minute per user
const commentArcjet = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: 60,
    max: 3,
  })
);

// Report limit: 5 reports per 5 minutes per user
const reportArcjet = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: 300,
    max: 5,
  })
);

// Auto-hide threshold: hide comment when it reaches this many reports
const AUTO_HIDE_REPORT_THRESHOLD = 3;

interface CreateCommentInput {
  noiDung: string;
  idBaiHoc: string;
  idCha?: string; // Parent comment ID for replies
}

export async function createComment(
  input: CreateCommentInput
): Promise<ApiResponse> {
  const session = await requireUser();
  const req = await request();

  // Rate limit check
  const decision = await commentArcjet.protect(req, {
    fingerprint: session.id,
  });

  if (decision.isDenied()) {
    return {
      status: "error",
      message: "Bạn đang gửi quá nhanh. Vui lòng chờ một chút.",
    };
  }

  try {
    // Determine capDo based on parent
    let capDo = 0;
    if (input.idCha) {
      const parentComment = await prisma.binhLuan.findUnique({
        where: { id: input.idCha },
        select: { capDo: true },
      });

      if (!parentComment) {
        return { status: "error", message: "Bình luận gốc không tồn tại" };
      }

      // Cap at level 1 (replies to replies still stay at level 1)
      capDo = Math.min(parentComment.capDo + 1, 1);
    }

    const newComment = await prisma.binhLuan.create({
      data: {
        noiDung: input.noiDung.trim(),
        capDo,
        idNguoiDung: session.id,
        idBaiHoc: input.idBaiHoc,
        idCha: input.idCha || null,
      },
      include: {
        baiHoc: {
          include: {
            chuong: {
              include: {
                khoaHoc: { select: { duongDan: true } }
              }
            }
          }
        }
      }
    });

    // --- NOTIFICATION LOGIC: REPLY TO COMMENT ---
    if (input.idCha) {
      const parentComment = await prisma.binhLuan.findUnique({
        where: { id: input.idCha },
        select: { idNguoiDung: true }
      });

      // Notify if replying to someone else
      if (parentComment && parentComment.idNguoiDung !== session.id) {
         await sendNotification({
           userId: parentComment.idNguoiDung,
           title: "Phản hồi mới",
           message: `${session.name || "Một người dùng"} đã trả lời bình luận của bạn.`,
           type: "KHOA_HOC",
           metadata: {
             type: "COMMENT_REPLY",
             lessonId: input.idBaiHoc,
             commentId: newComment.id,
             path: `/dashboard/${newComment.baiHoc.chuong.khoaHoc.duongDan}/${input.idBaiHoc}?commentId=${newComment.id}`
           }
         });
      }
    }
    // --------------------------------------------

    return { status: "success", message: "Đã thêm bình luận" };
  } catch (error) {
    console.error("Error creating comment:", error);
    return { status: "error", message: "Không thể thêm bình luận" };
  }
}

export async function deleteComment(idBinhLuan: string): Promise<ApiResponse> {
  const session = await requireUser();

  try {
    const comment = await prisma.binhLuan.findUnique({
      where: { id: idBinhLuan },
      select: { idNguoiDung: true },
    });

    if (!comment) {
      return { status: "error", message: "Bình luận không tồn tại" };
    }

    // Only owner can delete
    if (comment.idNguoiDung !== session.id) {
      return { status: "error", message: "Bạn không có quyền xóa bình luận này" };
    }

    // Soft delete - change status to DA_XOA
    await prisma.binhLuan.update({
      where: { id: idBinhLuan },
      data: { trangThai: "DA_XOA" },
    });

    return { status: "success", message: "Đã xóa bình luận" };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { status: "error", message: "Không thể xóa bình luận" };
  }
}

export async function updateComment(
  idBinhLuan: string,
  noiDung: string
): Promise<ApiResponse> {
  const session = await requireUser();

  if (!noiDung.trim()) {
    return { status: "error", message: "Nội dung không được để trống" };
  }

  try {
    const comment = await prisma.binhLuan.findUnique({
      where: { id: idBinhLuan },
      select: { idNguoiDung: true },
    });

    if (!comment) {
      return { status: "error", message: "Bình luận không tồn tại" };
    }

    // Only owner can edit
    if (comment.idNguoiDung !== session.id) {
      return { status: "error", message: "Bạn không có quyền sửa bình luận này" };
    }

    await prisma.binhLuan.update({
      where: { id: idBinhLuan },
      data: { noiDung: noiDung.trim() },
    });

    return { status: "success", message: "Đã cập nhật bình luận" };
  } catch (error) {
    console.error("Error updating comment:", error);
    return { status: "error", message: "Không thể cập nhật bình luận" };
  }
}

export async function getComments(idBaiHoc: string, showHidden: boolean = false) {
  // Get root comments with their replies
  const comments = await prisma.binhLuan.findMany({
    where: {
      idBaiHoc,
      trangThai: showHidden ? { in: ["HIEN", "AN"] } : "HIEN", // Admins can see hidden comments
      capDo: 0, // Only root comments
    },
    orderBy: { ngayTao: "desc" },
    include: {
      nguoiDung: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      replies: {
        where: { trangThai: showHidden ? { in: ["HIEN", "AN"] } : "HIEN" },
        orderBy: { ngayTao: "asc" },
        include: {
          nguoiDung: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: { 
              baoCaos: { 
                where: { trangThai: "ChoXuLy" } 
              } 
            },
          },
        },
      },
      _count: {
        select: { 
          baoCaos: { 
            where: { trangThai: "ChoXuLy" } 
          } 
        },
      },
    },
  });

  return comments;
}

export async function reportComment(
  idBinhLuan: string,
  lyDo: string
): Promise<ApiResponse> {
  const session = await requireUser();
  const req = await request();

  // Rate limit check
  const decision = await reportArcjet.protect(req, {
    fingerprint: session.id,
  });

  if (decision.isDenied()) {
    return {
      status: "error",
      message: "Bạn đã báo cáo quá nhiều. Vui lòng chờ một chút.",
    };
  }

  try {
    const comment = await prisma.binhLuan.findUnique({
      where: { id: idBinhLuan },
      include: {
        _count: { select: { baoCaos: true } },
      },
    });

    if (!comment) {
      return { status: "error", message: "Bình luận không tồn tại" };
    }

    // Check if already reported by this user
    const existingReport = await prisma.baoCaoBinhLuan.findUnique({
      where: {
        idNguoiDung_idBinhLuan: {
          idNguoiDung: session.id,
          idBinhLuan,
        },
      },
    });

    if (existingReport) {
      return { status: "error", message: "Bạn đã báo cáo bình luận này rồi" };
    }

    // Create report
    await prisma.baoCaoBinhLuan.create({
      data: {
        lyDo: lyDo.trim(),
        idNguoiDung: session.id,
        idBinhLuan,
      },
    });

    // --- ADMIN NOTIFICATION LOGIC (Anti-Spam: Only on first pending report) ---
    const pendingCount = await prisma.baoCaoBinhLuan.count({
      where: {
        idBinhLuan,
        trangThai: "ChoXuLy"
      }
    });

    if (pendingCount === 1) {
      // Fetch comment details for deep linking
      const commentDetails = await prisma.binhLuan.findUnique({
        where: { id: idBinhLuan },
        select: {
          idBaiHoc: true,
          baiHoc: {
            select: {
              chuong: {
                select: {
                   khoaHoc: { select: { duongDan: true } }
                }
              }
            }
          }
        }
      });

      if (commentDetails) {
        await notifyAdmins({
          title: "⚠️ Báo cáo bình luận mới",
          message: "Một bình luận vừa bị báo cáo và cần chờ xử lý.",
          type: "KIEM_DUYET",
          path: `/dashboard/${commentDetails.baiHoc.chuong.khoaHoc.duongDan}/${commentDetails.idBaiHoc}`,
          metadata: {
            type: "COMMENT_REPORT",
            lessonId: commentDetails.idBaiHoc,
            courseSlug: commentDetails.baiHoc.chuong.khoaHoc.duongDan,
            commentId: idBinhLuan
          }
        });
      }
    }
    // --------------------------------------------------------------------------

    // Auto-hide if threshold reached (Hậu kiểm)
    const newReportCount = comment._count.baoCaos + 1;
    if (newReportCount >= AUTO_HIDE_REPORT_THRESHOLD) {
      await prisma.binhLuan.update({
        where: { id: idBinhLuan },
        data: { trangThai: "AN" },
      });
    }

    return { status: "success", message: "Đã báo cáo bình luận" };
  } catch (error) {
    console.error("Error reporting comment:", error);
    return { status: "error", message: "Không thể báo cáo bình luận" };
  }
}
