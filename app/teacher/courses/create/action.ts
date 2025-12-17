"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import aj, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { khoaHocSchema, KhoaHocSchemaType } from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

export async function CreateCourse(values: KhoaHocSchemaType): Promise<ApiResponse> {
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
      } else {
        return {
          status: "error",
          message: "Chúng tôi nghi ngờ bạn là bot, nếu có vấn đề hãy liên hệ với support",
        };
      }
    }
    
    const validation = khoaHocSchema.safeParse(values);
    if (!validation.success) {
      return {
        status: "error",
        message: "Dữ liệu biểu mẫu không hợp lệ",
      };
    }

    // Kiểm tra trùng tiêu đề khóa học
    const existed = await prisma.khoaHoc.findFirst({
      where: {
        tenKhoaHoc: validation.data.tenKhoaHoc,
      },
      select: {
        id: true,
      },
    });

    if (existed) {
      return {
        status: "error",
        message: "Tiêu đề khóa học này đã tồn tại. Vui lòng chọn tiêu đề khác.",
      };
    }
    
    await prisma.khoaHoc.create({
      data: {
        ...validation.data,
        idNguoiDung: session.user.id, // Gán teacher ID
      },
    });
    
    revalidatePath("/teacher/courses");
    return {
      status: "success",
      message: "Khóa học đã được tạo thành công",
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Đã xảy ra lỗi khi tạo khóa học",
    };
  }
}