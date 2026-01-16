"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  sendNotification,
  NOTIFICATION_TEMPLATES,
} from "@/app/services/notification-service";
import { triggerUserNotification, getPusherServer } from "@/lib/pusher";

// Helper to trigger comment refresh on lesson pages
async function triggerCommentRefresh(lessonId: string) {
  const pusher = getPusherServer();
  await pusher.trigger(`lesson-${lessonId}`, "comment-refresh", { updatedAt: Date.now() });
}

// Helper to trigger admin dashboard refresh (Quality Control, Activity Logs)
async function triggerAdminRefresh(page: "quality-control" | "activity-logs" | "all") {
  const pusher = getPusherServer();
  const eventData = { updatedAt: Date.now(), page };
  
  // Trigger on public admin channel (all admins will receive this)
  await pusher.trigger("admin-dashboard", "data-refresh", eventData);
}

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

// 2. Xử lý báo cáo khóa học (IMPROVED VERSION WITH SNAPSHOT)
export async function resolveCourseReport(reportId: string, action: "BAN" | "IGNORE") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  // Fetch FULL report data including reporter info
  const report = await prisma.baoCaoKhoaHoc.findUnique({
    where: { id: reportId },
    include: { 
      khoaHoc: { 
        select: { 
          id: true,
          tenKhoaHoc: true, 
          duongDan: true,
          idNguoiDung: true 
        } 
      },
      nguoiDung: { 
        select: { 
          id: true, 
          name: true, 
          image: true, 
          role: true 
        } 
      }
    },
  });

  if (!report) throw new Error("Report not found");

  const snapshotData = {
    note: action === "BAN" ? `Khóa học vi phạm: ${report.khoaHoc.tenKhoaHoc}` : "Không vi phạm",
    meta: {
      reportReason: report.lyDo,
      courseName: report.khoaHoc.tenKhoaHoc,
      courseSlug: report.khoaHoc.duongDan,
      courseId: report.khoaHoc.id,
      reporter: {
        id: report.nguoiDung.id,
        name: report.nguoiDung.name,
        image: report.nguoiDung.image,
        role: report.nguoiDung.role 
      }
    }
  };

  // 1. Ghi Nhật ký xử lý với snapshot
  await prisma.nhatKyXuLy.create({
    data: {
      idAdmin: session.user.id,
      loaiBaoCao: "KHOA_HOC",
      idBaoCaoKhoaHoc: reportId, // Still exists at this point
      hanhDong: action === "BAN" ? "CHAN_KHOA_HOC" : "BO_QUA",
      lyDoXuLy: JSON.stringify(snapshotData),
    },
  });

  // 2. Execute action & Notify Teacher
  if (action === "BAN") {
    // Block course
    await prisma.khoaHoc.update({
      where: { id: report.idKhoaHoc },
      data: { trangThai: "BiChan" },
    });
    
    // Notify Teacher - Course blocked
    await prisma.thongBao.create({
      data: {
        tieuDe: "Khóa học bị khóa do báo cáo",
        noiDung: `Khóa học "${report.khoaHoc.tenKhoaHoc}" đã bị khóa do vi phạm chính sách.`,
        loai: "KIEM_DUYET",
        idNguoiDung: report.khoaHoc.idNguoiDung,
        metadata: { courseId: report.idKhoaHoc },
      },
    });
  } else {
    // IGNORE action - Parse report reason and notify teacher as feedback
    let reportReason = "Không rõ lý do";
    try {
      const reportData = JSON.parse(report.lyDo);
      reportReason = reportData.reason || reportData.details || report.lyDo;
    } catch {
      reportReason = report.lyDo;
    }
    
    // Notify Teacher - Feedback from student (PM requested feature)
    await prisma.thongBao.create({
      data: {
        tieuDe: "💡 Góp ý từ học viên",
        noiDung: `Khóa học "${report.khoaHoc.tenKhoaHoc}" nhận được góp ý: "${reportReason}". Admin đã xem xét và không xác định vi phạm, nhưng bạn có thể cân nhắc cải thiện nội dung.`,
        loai: "KHOA_HOC",
        idNguoiDung: report.khoaHoc.idNguoiDung,
        metadata: { 
          courseId: report.idKhoaHoc,
          type: "COURSE_FEEDBACK",
          reporterId: report.nguoiDung.id
        },
      },
    });
  }

  await prisma.baoCaoKhoaHoc.updateMany({
    where: { idKhoaHoc: report.idKhoaHoc },
    data: { trangThai: "DaXuLy" }
  });

  revalidatePath("/admin/quality-control");
  revalidatePath("/admin/activity-logs");
  
  // Trigger real-time refresh for admin dashboards
  await triggerAdminRefresh("all");
  
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
    include: { 
      nguoiDung: { select: { id: true, name: true, image: true, role: true } }, // Reporter
      binhLuan: {
        include: {
          nguoiDung: { select: { id: true, name: true } }, // Comment Author
          baiHoc: { select: { id: true } }
        }
      }
    },
  });

  if (!report) throw new Error("Report not found");

  const commentId = report.idBinhLuan;
  const lessonId = report.binhLuan.idBaiHoc;
  const reportReason = report.lyDo; // Store before deleting

  // ===== SNAPSHOT DATA - Save before deletion =====
  const snapshotData = {
    note: action === "DELETE" ? `Vi phạm: ${reportReason}` : "Không vi phạm",
    meta: {
      reportReason: report.lyDo,
      content: report.binhLuan.noiDung,
      authorName: report.binhLuan.nguoiDung.name,
      reporter: {
        name: report.nguoiDung?.name || "Không xác định",
        image: report.nguoiDung?.image,
        role: report.nguoiDung?.role 
      }
    }
  };

  // 1. Ghi Nhật ký xử lý TRƯỚC khi xóa reports (với snapshot)
  await prisma.nhatKyXuLy.create({
    data: {
      idAdmin: session.user.id,
      loaiBaoCao: "BINH_LUAN",
      idBaoCaoBinhLuan: reportId, // Still exists at this point
      hanhDong: action === "DELETE" ? "XOA_NOI_DUNG" : "BO_QUA",
      lyDoXuLy: JSON.stringify(snapshotData),
    },
  });

  // 2. Xử lý comment
  if (action === "DELETE") {
    // Soft delete comment
    await prisma.binhLuan.update({
      where: { id: commentId },
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
  } else {
    // IGNORE action: Reset comment status to HIEN (visible)
    await prisma.binhLuan.update({
      where: { id: commentId },
      data: { trangThai: "HIEN" },
    });
  }

  // 3. Mark ALL reports for this comment as RESOLVED (DaXuLy) - SOFT DELETE
  await prisma.baoCaoBinhLuan.updateMany({
    where: { idBinhLuan: commentId },
    data: { trangThai: "DaXuLy" }
  });

  revalidatePath("/admin/quality-control");
  revalidatePath("/admin/activity-logs");
  
  // 4. Trigger real-time refresh cho lesson page
  if (lessonId) {
    await triggerCommentRefresh(lessonId);
  }
  
  // 5. Trigger real-time refresh for admin dashboards
  await triggerAdminRefresh("all");
  
  return { success: true };
}

// 4. Xử lý báo cáo bình luận + Cấm user
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
      nguoiDung: { select: { id: true, name: true, image: true, role: true } }, 
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
  const commentId = report.idBinhLuan;
  const lessonId = report.binhLuan.baiHoc.id;

  const snapshotData = {
    note: banReason,
    meta: {
      reportReason: report.lyDo,
      content: report.binhLuan.noiDung,
      authorName: report.binhLuan.nguoiDung.name,
      reporter: {
        name: report.nguoiDung?.name || "Không xác định",
        image: report.nguoiDung?.image,
        role: report.nguoiDung?.role 
      }
    }
  };

  // 1. Soft delete comment
  await prisma.binhLuan.update({
    where: { id: commentId },
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

  // 3. Ghi Nhật ký xử lý trước khi xóa reports (với snapshot)
  await prisma.nhatKyXuLy.create({
    data: {
      idAdmin: session.user.id,
      loaiBaoCao: "BINH_LUAN",
      idBaoCaoBinhLuan: reportId,
      hanhDong: "CAM_USER",
      lyDoXuLy: JSON.stringify(snapshotData), 
      thoiHanCam: calculateBanDays(banExpires),
    },
  });

  // 4. Gửi thông báo cho user bị cấm
  const banTemplate = NOTIFICATION_TEMPLATES.USER_BANNED(banReason, banExpires);
  await sendNotification({
    userId,
    title: banTemplate.title,
    message: banTemplate.message,
    type: "KIEM_DUYET",
    metadata: {
      banReason,
      banExpires: banExpires?.toISOString() || null,
      commentId,
    },
  });

  await triggerUserNotification(userId, "user-banned", {
    reason: banReason,
    expiresAt: banExpires?.toISOString() || null,
    bannedAt: new Date().toISOString(),
  });


  await prisma.baoCaoBinhLuan.updateMany({
    where: { idBinhLuan: commentId },
    data: { trangThai: "DaXuLy" }
  });

  // 7. Trigger real-time refresh
  if (lessonId) {
    await triggerCommentRefresh(lessonId);
  }

  revalidatePath("/admin/quality-control");
  revalidatePath("/admin/users");
  revalidatePath("/admin/activity-logs");
  
  // 8. Trigger real-time refresh for admin dashboards
  await triggerAdminRefresh("all");
  
  return { 
    success: true, 
    message: banExpires 
      ? `Đã xóa bình luận và cấm ${report.binhLuan.nguoiDung.name} đến ${banExpires.toLocaleDateString("vi-VN")}`
      : `Đã xóa bình luận và cấm ${report.binhLuan.nguoiDung.name} vĩnh viễn`
  };
}

// 5. Cleanup old reports (optional utility)
export async function cleanupResolvedCommentReports() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const processedLogs = await prisma.nhatKyXuLy.findMany({
    where: {
      loaiBaoCao: "BINH_LUAN",
      idBaoCaoBinhLuan: { not: null },
    },
    select: { idBaoCaoBinhLuan: true },
  });

  const processedReportIds = processedLogs
    .map(log => log.idBaoCaoBinhLuan)
    .filter((id): id is string => id !== null);

  if (processedReportIds.length === 0) {
    return { success: true, deletedCount: 0, message: "Không có báo cáo cũ cần dọn dẹp" };
  }

  const result = await prisma.baoCaoBinhLuan.deleteMany({
    where: {
      id: { in: processedReportIds },
    },
  });

  revalidatePath("/admin/quality-control");
  revalidatePath("/admin/activity-logs");
  
  return { 
    success: true, 
    deletedCount: result.count,
    message: `Đã xóa ${result.count} báo cáo đã xử lý`
  };
}
