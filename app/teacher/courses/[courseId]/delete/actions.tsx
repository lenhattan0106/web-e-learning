"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { ApiResponse } from "@/lib/types";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import aj, { fixedWindow } from "@/lib/arcjet";
import { request } from "@arcjet/next";

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 3,
  })
);

export async function DeleteCourse(id: string): Promise<ApiResponse> {
  const session = await requireTeacher();
  
  try {
    const req = await request();
    const decision = await arcjet.protect(req, {
      fingerprint: session.user.id,
    });
    
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return {
          status: "error",
          message: "Bạn đã bị chặn do thực hiện quá nhiều yêu cầu",
        };
      }
      return {
        status: "error",
        message: "Chúng tôi nghi ngờ bạn là bot",
      };
    }

    // Verify ownership trước khi xóa
    const course = await prisma.khoaHoc.findUnique({
      where: {
        id,
        idNguoiDung: session.user.id, // Must be owned by this teacher
      },
    });

    if (!course) {
      return {
        status: "error",
        message: "Không tìm thấy khóa học hoặc bạn không có quyền xóa",
      };
    }

    // --- ENROLLMENT PROTECTION: Cannot delete course with paid students ---
    const enrollmentCount = await prisma.dangKyHoc.count({
      where: {
        idKhoaHoc: id,
        trangThai: "DaThanhToan"
      }
    });

    if (enrollmentCount > 0) {
      return {
        status: "error",
        message: `Không thể xóa khóa học này vì đã có ${enrollmentCount} học viên đăng ký. Bạn chỉ có thể LƯU TRỮ (Archive) khóa học.`,
      };
    }

    await prisma.khoaHoc.delete({
      where: { id },
    });

    revalidatePath("/teacher/courses");
    return {
      status: "success",
      message: "Khóa học đã được xóa thành công",
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Đã xảy ra lỗi khi xóa khóa học",
    };
  }
}

export async function ArchiveCourse(id: string): Promise<ApiResponse> {
  const session = await requireTeacher();
  
  try {
    const req = await request();
    const decision = await arcjet.protect(req, {
      fingerprint: session.user.id,
    });
    
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return {
          status: "error",
          message: "Bạn đã bị chặn do thực hiện quá nhiều yêu cầu",
        };
      }
      return {
        status: "error",
        message: "Chúng tôi nghi ngờ bạn là bot",
      };
    }

    // Verify ownership
    const course = await prisma.khoaHoc.findUnique({
      where: {
        id,
        idNguoiDung: session.user.id,
      },
      select: {
        id: true,
        tenKhoaHoc: true,
        duongDan: true,
        trangThai: true,
      }
    });

    if (!course) {
      return {
        status: "error",
        message: "Không tìm thấy khóa học hoặc bạn không có quyền lưu trữ",
      };
    }

    if (course.trangThai === "BanLuuTru") {
      return {
        status: "error",
        message: "Khóa học này đã ở trạng thái Lưu trữ",
      };
    }

    // Update status to Archive
    await prisma.khoaHoc.update({
      where: { id },
      data: { trangThai: "BanLuuTru" }
    });

    // Notify enrolled students about archive
    const { notifyEnrolledStudents, NOTIFICATION_TEMPLATES } = await import("@/app/services/notification-service");
    
    try {
      const template = NOTIFICATION_TEMPLATES.COURSE_ARCHIVED(course.tenKhoaHoc);
      await notifyEnrolledStudents({
        courseId: id,
        title: template.title,
        message: template.message,
        metadata: {
          url: `/dashboard/${course.duongDan}`,
          type: "COURSE_ARCHIVED",
          courseId: id
        }
      });
    } catch (notifyError) {
      console.error("Failed to notify students about archive:", notifyError);
    }

    revalidatePath("/teacher/courses");
    return {
      status: "success",
      message: "Khóa học đã được chuyển sang trạng thái Lưu trữ thành công",
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Đã xảy ra lỗi khi lưu trữ khóa học",
    };
  }
}