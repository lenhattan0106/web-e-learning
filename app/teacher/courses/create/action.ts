"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import aj, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { khoaHocSchema, KhoaHocSchemaType } from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { generateUniqueSlug, slugify } from "@/lib/slug-utils";
import { embedKhoaHoc } from "@/lib/ai/auto-embed";

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
    
    // Check existence - only category and level
    const [existingCategory, existingLevel] = await Promise.all([
      prisma.danhMuc.findUnique({ where: { id: validation.data.danhMuc } }),
      prisma.capDo.findUnique({ where: { id: validation.data.capDo } }),
    ]);

    if (!existingCategory || !existingLevel) {
       return { status: "error", message: "Danh mục hoặc cấp độ không hợp lệ" };
    }

    // Generate unique slug from course title
    const baseSlug = slugify(validation.data.tenKhoaHoc);
    const uniqueSlug = await generateUniqueSlug(baseSlug);

    const createdCourse = await prisma.khoaHoc.create({
      data: {
        tenKhoaHoc: validation.data.tenKhoaHoc,
        moTa: validation.data.moTa,
        tepKH: validation.data.tepKH,
        gia: validation.data.gia,
        thoiLuong: validation.data.thoiLuong,
        moTaNgan: validation.data.moTaNgan,
        duongDan: uniqueSlug, // Use auto-generated unique slug
        
        // Relations
        idDanhMuc: existingCategory.id,
        idCapDo: existingLevel.id,
        trangThai: validation.data.trangThai as any, // Use enum directly from form

        // Backward Compatibility (Best Effort - Deprecated fields)
        danhMuc: existingCategory.tenDanhMuc, 
        capDo: (existingLevel.maCapDo === "NGUOI_MOI" ? "NguoiMoi" : 
                existingLevel.maCapDo === "TRUNG_CAP" ? "TrungCap" : 
                existingLevel.maCapDo === "NANG_CAO" ? "NangCao" : undefined),

        idNguoiDung: session.user.id,
      },
    });
    
    // Auto-generate embedding for AI search
    embedKhoaHoc(
      createdCourse.id,
      validation.data.tenKhoaHoc,
      validation.data.moTaNgan,
      validation.data.moTa
    );
    
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



export async function getTeacherCourseTitles(): Promise<string[]> {
  try {
    const session = await requireTeacher();
    const courses = await prisma.khoaHoc.findMany({
      where: {
        idNguoiDung: session.user.id,
      },
      select: {
        tenKhoaHoc: true,
      },
      orderBy: {
        ngayTao: "desc",
      },
    });
    return courses.map((course) => course.tenKhoaHoc);
  } catch (error) {
    console.error("Failed to fetch teacher course titles", error);
    return [];
  }
}