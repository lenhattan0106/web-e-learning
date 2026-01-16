"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import aj, { slidingWindow } from "@/lib/arcjet";
import { request } from "@arcjet/next";
import { notifyAdmins } from "@/app/services/admin-notification-service";

// Rate limit: 5 course reports per 5 minutes per user
const reportCourseArcjet = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: 300,
    max: 5,
  })
);

interface ReportCourseInput {
  courseId: string;
  reason: string;
  details?: string; 
  lessonId?: string; 
}

export async function reportCourse(
  input: ReportCourseInput
): Promise<ApiResponse> {
  const session = await requireUser();
  const req = await request();

  // Rate limit check
  const decision = await reportCourseArcjet.protect(req, {
    fingerprint: session.id,
  });

  if (decision.isDenied()) {
    return {
      status: "error",
      message: "Bạn đã gửi quá nhiều báo cáo. Vui lòng chờ một chút.",
    };
  }

  try {
    // 1. Verify course exists
    const course = await prisma.khoaHoc.findUnique({
      where: { id: input.courseId },
      select: {
        id: true,
        tenKhoaHoc: true,
        duongDan: true,
        idNguoiDung: true,
      },
    });

    if (!course) {
      return { status: "error", message: "Khóa học không tồn tại" };
    }

    // 2. Check if user owns this course (enrolled with paid status)
    const enrollment = await prisma.dangKyHoc.findUnique({
      where: {
        idNguoiDung_idKhoaHoc: {
          idNguoiDung: session.id,
          idKhoaHoc: input.courseId,
        },
      },
      select: { trangThai: true },
    });

    if (!enrollment || enrollment.trangThai !== "DaThanhToan") {
      return {
        status: "error",
        message: "Bạn cần mua khóa học này mới có thể báo cáo",
      };
    }

    // 3. Check for duplicate pending report
    const existingReport = await prisma.baoCaoKhoaHoc.findFirst({
      where: {
        idNguoiDung: session.id,
        idKhoaHoc: input.courseId,
        trangThai: "ChoXuLy",
      },
    });

    if (existingReport) {
      return {
        status: "error",
        message: "Bạn đã báo cáo khóa học này rồi. Vui lòng chờ Admin xử lý.",
      };
    }

    // 4. Build report data with context (PM enhancement)
    const reportData = {
      reason: input.reason,
      details: input.details || null,
      lessonId: input.lessonId || null, // Auto-attached lesson context
      reportedBy: {
        id: session.id,
        name: session.name,
      },
      reportedAt: new Date().toISOString(),
    };

    // 5. Create report
    await prisma.baoCaoKhoaHoc.create({
      data: {
        idNguoiDung: session.id,
        idKhoaHoc: input.courseId,
        lyDo: JSON.stringify(reportData),
        trangThai: "ChoXuLy",
      },
    });

    // 6. Notify Admin via Pusher (Anti-spam: only on first pending report)
    const pendingCount = await prisma.baoCaoKhoaHoc.count({
      where: {
        idKhoaHoc: input.courseId,
        trangThai: "ChoXuLy",
      },
    });

    if (pendingCount === 1) {
      await notifyAdmins({
        title: "⚠️ Báo cáo khóa học mới",
        message: `Khóa học "${course.tenKhoaHoc}" vừa bị báo cáo: ${input.reason}`,
        type: "KIEM_DUYET",
        path: `/admin/quality-control?tab=courses`,
        metadata: {
          type: "COURSE_REPORT",
          courseId: course.id,
          courseSlug: course.duongDan,
        },
      });
    }

    return {
      status: "success",
      message: "Đã gửi báo cáo. Cảm ơn bạn đã đóng góp để nâng cao chất lượng!",
    };
  } catch (error) {
    console.error("Error reporting course:", error);
    return { status: "error", message: "Không thể gửi báo cáo. Vui lòng thử lại." };
  }
}

/**
 * Check if user can report a course (must be enrolled with DaThanhToan status)
 */
export async function canReportCourse(courseId: string): Promise<boolean> {
  try {
    const session = await requireUser();
    
    const enrollment = await prisma.dangKyHoc.findUnique({
      where: {
        idNguoiDung_idKhoaHoc: {
          idNguoiDung: session.id,
          idKhoaHoc: courseId,
        },
      },
      select: { trangThai: true },
    });

    return enrollment?.trangThai === "DaThanhToan";
  } catch {
    return false;
  }
}

/**
 * Check if user has already reported this course (pending report exists)
 */
export async function hasReportedCourse(courseId: string): Promise<boolean> {
  try {
    const session = await requireUser();
    
    const existingReport = await prisma.baoCaoKhoaHoc.findFirst({
      where: {
        idNguoiDung: session.id,
        idKhoaHoc: courseId,
        trangThai: "ChoXuLy",
      },
    });

    return !!existingReport;
  } catch {
    return false;
  }
}
