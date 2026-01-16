"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import aj, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";
import { ApiResponse } from "@/lib/types";
import { couponFormSchema, CouponFormType } from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { embedMaGiamGia } from "@/lib/ai/auto-embed";

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

export async function CreateCoupon(values: CouponFormType): Promise<ApiResponse> {
  const session = await requireTeacher();

  // 1. Anti-bot & rate limit
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
      message: "Chúng tôi nghi ngờ bạn là bot, nếu có vấn đề hãy liên hệ với support",
    };
  }

  // 2. Validate dữ liệu đầu vào
  const validation = couponFormSchema.safeParse(values);
  if (!validation.success) {
    return {
      status: "error",
      message: "Dữ liệu biểu mẫu không hợp lệ",
    };
  }
  const data = validation.data;

  // 3. Kiểm tra trùng mã giảm giá (unique)
  const existed = await prisma.maGiamGia.findUnique({
    where: { maGiamGia: data.maGiamGia },
    select: { id: true },
  });
  if (existed) {
    return {
      status: "error",
      message: "Mã giảm giá này đã tồn tại, vui lòng sử dụng mã khác.",
    };
  }

  // 4. Chuẩn hóa dữ liệu tạo
  const createData: Prisma.maGiamGiaCreateInput = {
    tieuDe: data.tieuDe,
    moTa: data.moTa || undefined, // Mô tả chiến dịch cho AI semantic search
    maGiamGia: data.maGiamGia,
    ngayBatDau: data.ngayBatDau ? new Date(data.ngayBatDau) : undefined,
    ngayKetThuc: data.ngayKetThuc ? new Date(data.ngayKetThuc) : undefined,
    hoatDong: data.hoatDong ?? true,
    giaTri: data.giaTri,
    loai: data.loai,
    soLuong: data.soLuong ?? 0,
    daSuDung: 0,
  };

  // 5. Transaction: tạo mã + liên kết khóa học (nếu có)
  try {
    const createdId = await prisma.$transaction(async (tx) => {
      const created = await tx.maGiamGia.create({ data: createData });

      const courseIds: string[] = Array.isArray(data.idKhoaHoc) ? data.idKhoaHoc : [];
      if (courseIds.length > 0) {
        // Kiểm tra quyền sở hữu khóa học
        const ownedCount = await tx.khoaHoc.count({
          where: {
            id: { in: courseIds },
            idNguoiDung: session.user.id,
          },
        });
        if (ownedCount !== courseIds.length) {
          throw new Error("Có khóa không thuộc về bạn hoặc không tồn tại");
        }
        // Tạo liên kết many-to-many
        const links = courseIds.map((kid) => ({
          maGiamGiaId: created.id,
          khoaHocId: kid,
        }));
        await tx.maGiamGiaKhoaHoc.createMany({
          data: links,
          skipDuplicates: true,
        });
      }
      return created.id;
    });

    // Auto-generate embedding for AI semantic search
    if (data.moTa) {
      embedMaGiamGia(createdId, data.tieuDe, data.moTa);
    }

    revalidatePath("/teacher/coupon");
    return {
      status: "success",
      message: "Mã giảm giá đã được tạo thành công",
    };
  } catch (err) {
    let message = "Đã xảy ra lỗi khi tạo mã giảm giá";
    if (err instanceof Error) {
      if (err.message.includes("không thuộc về bạn")) {
        message = err.message;
      }
      console.error("Tạo coupon transaction error:", err.message);
    } else {
      console.error("Tạo coupon transaction error:", err);
    }
    return { status: "error", message };
  }
}

export async function CheckCouponCode(code: string): Promise<{ exists: boolean; courseCount?: number }> {
    try {
        const coupon = await prisma.maGiamGia.findUnique({
            where: { maGiamGia: code },
            include: {
                _count: {
                    select: { maGiamGiaKhoaHocs: true }
                }
            }
        });
        
        if (coupon) {
            return { exists: true, courseCount: coupon._count.maGiamGiaKhoaHocs };
        }
        return { exists: false };
    } catch (error) {
        console.error("Check coupon error:", error);
        return { exists: false };
    }
}

export async function UpdateCoupon(id: string, values: CouponFormType): Promise<ApiResponse> {
  const session = await requireTeacher();

  try {
    const req = await request();
    const decision = await arcjet.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Yêu cầu bị từ chối do giới hạn tần suất",
      };
    }

    const validation = couponFormSchema.safeParse(values);
    if (!validation.success) {
      return {
        status: "error",
        message: "Dữ liệu không hợp lệ",
      };
    }
    const data = validation.data;

    // Check unique code (exclude current id)
    const existing = await prisma.maGiamGia.findFirst({
      where: { 
        maGiamGia: data.maGiamGia,
        id: { not: id } 
      },
      select: { id: true }
    });

    if (existing) {
      return {
        status: "error",
        message: "Mã giảm giá đã tồn tại",
      };
    }

    const { idKhoaHoc, ...updateFields } = data;

    const updateData: Prisma.maGiamGiaUpdateInput = {
      tieuDe: updateFields.tieuDe,
      moTa: updateFields.moTa || null, // Mô tả chiến dịch cho AI semantic search
      maGiamGia: updateFields.maGiamGia,
      ngayBatDau: updateFields.ngayBatDau ? new Date(updateFields.ngayBatDau) : null,
      ngayKetThuc: updateFields.ngayKetThuc ? new Date(updateFields.ngayKetThuc) : null,
      hoatDong: updateFields.hoatDong,
      giaTri: updateFields.giaTri,
      loai: updateFields.loai,
      soLuong: updateFields.soLuong ?? 0,
    };

    await prisma.$transaction(async (tx) => {
      // Update basic fields
      await tx.maGiamGia.update({
        where: { id },
        data: updateData,
      });

      // Update relations
      // 1. Delete existing
      await tx.maGiamGiaKhoaHoc.deleteMany({
        where: { maGiamGiaId: id },
      });

      // 2. Create new
      const courseIds = Array.isArray(idKhoaHoc) ? idKhoaHoc : [];
      if (courseIds.length > 0) {
         // Verify ownership again
         const ownedCount = await tx.khoaHoc.count({
            where: {
                id: { in: courseIds },
                idNguoiDung: session.user.id
            }
         });
         // Strict check: Teacher can only attach their own courses
         if (ownedCount !== courseIds.length) {
            throw new Error("Một số khóa học không thuộc quyền quản lý của bạn"); 
         }

         const links = courseIds.map(kid => ({
             maGiamGiaId: id,
             khoaHocId: kid
         }));
         await tx.maGiamGiaKhoaHoc.createMany({ data: links });
      }
    });

    // Auto-update embedding for AI semantic search
    if (data.moTa) {
      embedMaGiamGia(id, data.tieuDe, data.moTa);
    }

    revalidatePath("/teacher/coupon");
    return {
      status: "success",
      message: "Cập nhật mã giảm giá thành công",
    };

  } catch (error) {
    console.error("Update coupon error", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Lỗi server khi cập nhật",
    };
  }
}