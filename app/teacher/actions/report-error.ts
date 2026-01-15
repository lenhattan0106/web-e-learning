"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import {
  calculateCategoryImpact,
  calculateLevelImpact,
} from "@/app/data/teacher/check-protection";
import { notifyAdmins } from "@/app/services/admin-notification-service";

interface ReportErrorData {
  type: "CATEGORY" | "LEVEL";
  objectId: string;
  objectName: string;
  action: "EDIT" | "DELETE";
  newName?: string;
  reason: string;
}


export async function reportCategoryLevelError(data: ReportErrorData) {
  const session = await requireTeacher();

  try {
    // Calculate impact
    const impact =
      data.type === "CATEGORY"
        ? await calculateCategoryImpact(data.objectId)
        : await calculateLevelImpact(data.objectId);

    // Select a published course that uses this category/level (prefer DaXuatBan for realistic impact view)
    const course = await prisma.khoaHoc.findFirst({
      where: data.type === "CATEGORY"
        ? { 
            OR: [
              { idDanhMuc: data.objectId },
              { danhMucRef: { idDanhMucCha: data.objectId } }
            ]
          }
        : { idCapDo: data.objectId },
      orderBy: { trangThai: 'asc' }, // Prioritize published courses
      select: { id: true, tenKhoaHoc: true }
    });

    if (!course) {
      return {
        error: "Không tìm thấy khóa học liên quan để tạo báo cáo.",
      };
    }

    // SYSTEM_REQUEST marker helps Admin differentiate from student violation reports
    const reportData = {
      __reportType: "SYSTEM_REQUEST", // Badge: Sửa sót hệ thống (Teacher)
      type: `${data.type}_${data.action}`, // e.g., "CATEGORY_EDIT"
      objectId: data.objectId,
      objectType: data.type,
      currentName: data.objectName,
      newName: data.newName,
      reason: data.reason,
      impact,
      requestedBy: {
        id: session.user.id,
        name: session.user.name,
      },
      requestedAt: new Date().toISOString(),
    };

    const report = await prisma.baoCaoKhoaHoc.create({
      data: {
        idNguoiDung: session.user.id,
        idKhoaHoc: course.id, 
        lyDo: JSON.stringify(reportData), 
        trangThai: "ChoXuLy",
      },
    });

    // --- ADMIN NOTIFICATION LOGIC ---
    const isSystemRequest = reportData.__reportType === "SYSTEM_REQUEST";
    let shouldNotify = false;

    if (isSystemRequest) {
      // Always notify for System Requests (Teacher initiated)
      shouldNotify = true;
    } else {
      // Anti-Spam for Regular Reports: Only notify on first pending report
      const pendingCount = await prisma.baoCaoKhoaHoc.count({
        where: {
          idKhoaHoc: course.id,
          trangThai: "ChoXuLy",
          lyDo: { not: { contains: "SYSTEM_REQUEST" } }
        }
      });
      if (pendingCount === 1) shouldNotify = true;
    }



// ... existing code ...

    if (shouldNotify) {
      const title = isSystemRequest ? `Yêu cầu hệ thống: ${reportData.type}` : "Báo cáo khóa học mới";
      const content = isSystemRequest 
        ? `Giáo viên ${session.user.name} vừa gửi yêu cầu: ${reportData.type} - ${data.action}.`
        : `Khóa học "${course.tenKhoaHoc}" vừa bị báo cáo và cần kiểm tra.`;
      
      const path = `/admin/quality-control?tab=courses`; // Both lead to Quality Control

      const metadata = isSystemRequest ? {
        type: "SYSTEM_REQUEST",
        courseId: course.id,
        requestId: report.id,
        action: data.action
      } : {
        type: "COURSE_REPORT",
        courseId: course.id
      };

      await notifyAdmins({
        title,
        message: content,
        type: "KIEM_DUYET",
        path,
        metadata
      });
    }

    return {
      success: true,
      message:
        "Yêu cầu đã được gửi đến admin. Bạn sẽ nhận thông báo khi có kết quả.",
    };
  } catch (error) {
    console.error("Error reporting category/level error:", error);
    return {
      error: "Không thể gửi yêu cầu. Vui lòng thử lại sau.",
    };
  }
}
