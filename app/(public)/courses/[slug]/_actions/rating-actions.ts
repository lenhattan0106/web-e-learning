"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import aj, { slidingWindow } from "@/lib/arcjet";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";

// Rate limit: 1 rating per 5 minutes per user (to prevent spam updates)
const ratingArcjet = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    interval: 300, // 5 minutes
    max: 1,
  })
);

interface SubmitRatingInput {
  idKhoaHoc: string;
  diemDanhGia: number; // 1-5
  noiDung?: string;
}

/**
 * Submit or update a rating for a course
 * Only users who have purchased the course can rate it
 */
export async function submitRating(
  input: SubmitRatingInput
): Promise<ApiResponse> {
  const session = await requireUser();
  const req = await request();

  // Validate rating score
  if (input.diemDanhGia < 1 || input.diemDanhGia > 5) {
    return {
      status: "error",
      message: "Điểm đánh giá phải từ 1 đến 5 sao.",
    };
  }

  // Rate limit check
  const decision = await ratingArcjet.protect(req, {
    fingerprint: `${session.id}-rating`,
  });

  if (decision.isDenied()) {
    return {
      status: "error",
      message: "Bạn đã đánh giá gần đây. Vui lòng chờ 5 phút để thử lại.",
    };
  }

  try {
    // Check if user has purchased the course (DaThanhToan status)
    const enrollment = await prisma.dangKyHoc.findUnique({
      where: {
        idNguoiDung_idKhoaHoc: {
          idNguoiDung: session.id,
          idKhoaHoc: input.idKhoaHoc,
        },
      },
      select: {
        trangThai: true,
      },
    });

    if (!enrollment || enrollment.trangThai !== "DaThanhToan") {
      return {
        status: "error",
        message: "Bạn cần mua khóa học để có thể đánh giá.",
      };
    }

    // Upsert: Create if not exists, update if exists
    await prisma.danhGia.upsert({
      where: {
        idNguoiDung_idKhoaHoc: {
          idNguoiDung: session.id,
          idKhoaHoc: input.idKhoaHoc,
        },
      },
      update: {
        diemDanhGia: input.diemDanhGia,
        noiDung: input.noiDung?.trim() || null,
      },
      create: {
        idNguoiDung: session.id,
        idKhoaHoc: input.idKhoaHoc,
        diemDanhGia: input.diemDanhGia,
        noiDung: input.noiDung?.trim() || null,
      },
    });

    // Get course slug for revalidation
    const course = await prisma.khoaHoc.findUnique({
      where: { id: input.idKhoaHoc },
      select: { duongDan: true },
    });

    if (course) {
      revalidatePath(`/courses/${course.duongDan}`);
      revalidatePath("/courses");
    }

    return {
      status: "success",
      message: "Đã gửi đánh giá thành công!",
    };
  } catch (error) {
    console.error("Error submitting rating:", error);
    return {
      status: "error",
      message: "Không thể gửi đánh giá. Vui lòng thử lại.",
    };
  }
}

/**
 * Get the current user's rating for a specific course
 */
export async function getUserRating(idKhoaHoc: string) {
  try {
    const session = await requireUser();

    const rating = await prisma.danhGia.findUnique({
      where: {
        idNguoiDung_idKhoaHoc: {
          idNguoiDung: session.id,
          idKhoaHoc,
        },
      },
      select: {
        id: true,
        diemDanhGia: true,
        noiDung: true,
        ngayTao: true,
        ngayCapNhat: true,
      },
    });

    return rating;
  } catch {
    // User not logged in or other error
    return null;
  }
}

/**
 * Get all visible ratings for a course with pagination and filter
 */
export async function getCourseRatings(
  idKhoaHoc: string,
  options?: {
    take?: number;
    skip?: number;
    filterStar?: number; // Filter by specific star rating (1-5)
  }
) {
  const { take = 10, skip = 0, filterStar } = options || {};

  const where = {
    idKhoaHoc,
    trangThai: "HIEN" as const,
    ...(filterStar && { diemDanhGia: filterStar }),
  };

  const [ratings, total] = await Promise.all([
    prisma.danhGia.findMany({
      where,
      orderBy: { ngayTao: "desc" },
      take,
      skip,
      select: {
        id: true,
        diemDanhGia: true,
        noiDung: true,
        ngayTao: true,
        nguoiDung: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    }),
    prisma.danhGia.count({ where }),
  ]);

  return { ratings, total };
}

/**
 * Calculate average rating for a course
 */
export async function getCourseAverageRating(idKhoaHoc: string) {
  const result = await prisma.danhGia.aggregate({
    where: {
      idKhoaHoc,
      trangThai: "HIEN",
    },
    _avg: {
      diemDanhGia: true,
    },
    _count: {
      diemDanhGia: true,
    },
  });

  return {
    averageRating: result._avg.diemDanhGia || 0,
    totalRatings: result._count.diemDanhGia || 0,
  };
}

/**
 * Get rating distribution for a course (count of each star rating)
 */
export async function getRatingDistribution(idKhoaHoc: string) {
  const distribution = await prisma.danhGia.groupBy({
    by: ["diemDanhGia"],
    where: {
      idKhoaHoc,
      trangThai: "HIEN",
    },
    _count: {
      diemDanhGia: true,
    },
  });

  // Convert to a more usable format: { 1: count, 2: count, ... 5: count }
  const result: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((item: { diemDanhGia: number; _count: { diemDanhGia: number } }) => {
    result[item.diemDanhGia] = item._count.diemDanhGia;
  });

  return result;
}
