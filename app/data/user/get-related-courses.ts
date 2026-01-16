import "server-only";

import { prisma } from "@/lib/db";
import { requireUser } from "./require-user";
import { unstable_cache } from "next/cache";

interface RelatedCourse {
  id: string;
  tenKhoaHoc: string;
  moTaNgan: string;
  gia: number;
  duongDan: string;
  tepKH: string;
  thoiLuong: number;
  danhMuc: string | null;
  capDo: string | null;
  similarity: number;
  nguoiDung: {
    id: string;
    name: string;
    image: string | null;
  };
}
// Lấy khóa học gợi ý dựa trên Vector Embedding của các khóa học đã đăng ký học.
async function fetchRelatedCourses(
  enrolledCourseIds: string[],
  userId: string,
  limit: number = 2
): Promise<RelatedCourse[]> {
  if (enrolledCourseIds.length === 0) {
    return [];
  }

  try {
    const relatedCourses: RelatedCourse[] = await prisma.$queryRaw`
      WITH user_avg_vector AS (
        SELECT AVG(embedding)::vector(768) as avg_embedding
        FROM "khoaHoc"
        WHERE id = ANY(${enrolledCourseIds}::text[])
        AND embedding IS NOT NULL
      )
      SELECT 
        kh.id,
        kh."tenKhoaHoc",
        kh."moTaNgan",
        kh.gia,
        kh."duongDan",
        kh."tepKH",
        kh."thoiLuong",
        dm."ten_danh_muc" as "danhMuc",
        cd."ten_cap_do" as "capDo",
        1 - (kh.embedding <=> (SELECT avg_embedding FROM user_avg_vector)) as similarity,
        nd."idND" as "nguoiDungId",
        nd."hoTen" as "nguoiDungName",
        nd."anhDaiDien" as "nguoiDungImage"
      FROM "khoaHoc" kh
      LEFT JOIN "danh_muc" dm ON kh."id_danh_muc" = dm.id
      LEFT JOIN "cap_do" cd ON kh."id_cap_do" = cd.id
      LEFT JOIN "nguoiDung" nd ON kh."idNguoiDung" = nd."idND"
      WHERE kh.embedding IS NOT NULL
      AND kh."trangThai" = 'BanChinhThuc'
      AND kh.id <> ALL(${enrolledCourseIds}::text[])
      AND (SELECT avg_embedding FROM user_avg_vector) IS NOT NULL
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return relatedCourses.map((course: any) => ({
      id: course.id,
      tenKhoaHoc: course.tenKhoaHoc,
      moTaNgan: course.moTaNgan,
      gia: course.gia,
      duongDan: course.duongDan,
      tepKH: course.tepKH,
      thoiLuong: course.thoiLuong,
      danhMuc: course.danhMuc,
      capDo: course.capDo,
      similarity: Number(course.similarity),
      nguoiDung: {
        id: course.nguoiDungId,
        name: course.nguoiDungName,
        image: course.nguoiDungImage,
      },
    }));
  } catch (error) {
    console.error("Error fetching related courses:", error);
    return [];
  }
}

// Lấy khóa học phổ biến nhất khi chưa mua khóa học 
async function fetchPopularCourses(
  excludeIds: string[] = [],
  limit: number = 2
): Promise<RelatedCourse[]> {
  const courses = await prisma.khoaHoc.findMany({
    where: {
      trangThai: "BanChinhThuc",
      id: { notIn: excludeIds },
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      moTaNgan: true,
      gia: true,
      duongDan: true,
      tepKH: true,
      thoiLuong: true,
      danhMucRef: { select: { tenDanhMuc: true } },
      capDoRef: { select: { tenCapDo: true } },
      nguoiDung: { select: { id: true, name: true, image: true } },
      _count: { select: { dangKyHocs: true } },
    },
    orderBy: [
      { dangKyHocs: { _count: "desc" } },
      { ngayTao: "desc" },
    ],
    take: limit,
  });

  return courses.map((course) => ({
    id: course.id,
    tenKhoaHoc: course.tenKhoaHoc,
    moTaNgan: course.moTaNgan,
    gia: course.gia,
    duongDan: course.duongDan,
    tepKH: course.tepKH,
    thoiLuong: course.thoiLuong,
    danhMuc: course.danhMucRef?.tenDanhMuc || null,
    capDo: course.capDoRef?.tenCapDo || null,
    similarity: 0, 
    nguoiDung: course.nguoiDung,
  }));
}

export async function getRelatedCourses(enrolledCourseIds: string[]) {
  const user = await requireUser();

  // Tạo cached để lưu trữ gợi ý khóa học
  const getCachedRelatedCourses = unstable_cache(
    async () => {
      const relatedCourses = await fetchRelatedCourses(enrolledCourseIds, user.id, 2);

      // Học viên chưa mua khóa học nào
      if (relatedCourses.length === 0) {
        const popularCourses = await fetchPopularCourses(enrolledCourseIds, 2);
        return {
          courses: popularCourses,
          type: "popular" as const,
        };
      }

      return {
        courses: relatedCourses,
        type: "related" as const,
      };
    },
    [`related-courses-${user.id}`],
    {
      revalidate: 86400, // Cache 1 ngày
      tags: [`user-${user.id}-related-courses`],
    }
  );

  return getCachedRelatedCourses();
}

export type RelatedCoursesResult = Awaited<ReturnType<typeof getRelatedCourses>>;
export type { RelatedCourse };
