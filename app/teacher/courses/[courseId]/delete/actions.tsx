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