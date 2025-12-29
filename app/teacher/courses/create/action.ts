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

    // Kiểm tra trùng tiêu đề khóa học (trong phạm vi giáo viên hiện tại)
    const existed = await prisma.khoaHoc.findFirst({
      where: {
        tenKhoaHoc: validation.data.tenKhoaHoc,
        idNguoiDung: session.user.id, // Only check teacher's own courses
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
    
    // Check existence
    const [existingCategory, existingLevel, existingStatus] = await Promise.all([
      prisma.danhMuc.findUnique({ where: { id: validation.data.danhMuc } }),
      prisma.capDo.findUnique({ where: { id: validation.data.capDo } }),
      prisma.trangThaiKhoaHoc.findUnique({ where: { id: validation.data.trangThai } }),
    ]);

    if (!existingCategory || !existingLevel || !existingStatus) {
       return { status: "error", message: "Danh mục, cấp độ hoặc trạng thái không hợp lệ" };
    }

    await prisma.khoaHoc.create({
      data: {
        tenKhoaHoc: validation.data.tenKhoaHoc,
        moTa: validation.data.moTa,
        tepKH: validation.data.tepKH,
        gia: validation.data.gia,
        thoiLuong: validation.data.thoiLuong,
        moTaNgan: validation.data.moTaNgan,
        duongDan: validation.data.duongDan,
        
        // New Relations (Vietnamese)
        idDanhMuc: existingCategory.id,
        idCapDo: existingLevel.id,
        idTrangThai: existingStatus.id,

        // Backward Compatibility (Best Effort - Deprecated fields)
        danhMuc: existingCategory.tenDanhMuc, 
        // Map to Enum if codes match known ones
        capDo: (["NGUOI_MOI", "TRUNG_CAP", "NANG_CAO"].includes(existingLevel.maCapDo) ? existingLevel.maCapDo as any : undefined),
        trangThai: (["BanNhap", "BanChinhThuc", "BanLuuTru"].includes(existingStatus.maTrangThai) ? 
            existingStatus.maTrangThai as any : undefined),

        idNguoiDung: session.user.id,
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