import "server-only";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@/lib/generated/prisma";

// ✅ Thêm pagination params
export interface CourseFilterParams {
  keyword?: string;
  categoryId?: string;
  levelId?: string;
  tab?: string; // "all" | "free" | "purchased"
  page?: number;
  pageSize?: number;
}

interface SessionUser {
  id: string;
  role: string | null | undefined;
}

// ✅ Constants
const DEFAULT_PAGE_SIZE = 6; // 3 cols x 2 rows

// ✅ Return type với pagination info
export interface PaginatedCoursesResult {
  courses: CourseWithOwnership[];
  totalCourses: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export async function getAllCoursesWithOwnership(
  filters?: CourseFilterParams, 
  sessionUser?: SessionUser
): Promise<PaginatedCoursesResult> {
  let userId: string | undefined;
  let userRole: string | undefined | null;

  if (sessionUser) {
    userId = sessionUser.id;
    userRole = sessionUser.role;
  } else {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    userId = session?.user?.id;
    userRole = session?.user?.role;
  }
  
  const tab = filters?.tab || "all";
  const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
  
  // ✅ Edge case: page < 1 → default to 1
  let requestedPage = filters?.page || 1;
  if (requestedPage < 1 || isNaN(requestedPage)) {
    requestedPage = 1;
  }

  if (tab === "purchased" && !userId) {
    return {
      courses: [],
      totalCourses: 0,
      totalPages: 0,
      currentPage: 1,
      pageSize,
    };
  }

  // ✅ Build access condition (visibility rules)
  let accessCondition: Prisma.KhoaHocWhereInput;

  if (!userId) {
    accessCondition = { trangThai: "BanChinhThuc" };
  } else if (userRole === "admin") {
    accessCondition = {
      trangThai: { in: ["BanChinhThuc", "BanLuuTru"] },
    };
  } else {
    accessCondition = {
      OR: [
        { trangThai: "BanChinhThuc" },
        {
          trangThai: { in: ["BanLuuTru", "BiChan"] },
          idNguoiDung: userId, 
        },
        {
          trangThai: "BanLuuTru",
          dangKyHocs: {
            some: {
              idNguoiDung: userId,
              trangThai: "DaThanhToan",
            },
          },
        },
      ],
    };
  }

  // ✅ Build filter conditions (shared between count and findMany)
  const filterConditions: Prisma.KhoaHocWhereInput[] = [];

  // 1. Keyword
  if (filters?.keyword && filters.keyword.trim() !== "") {
    filterConditions.push({
      tenKhoaHoc: {
        contains: filters.keyword.trim(),
        mode: "insensitive",
      },
    });
  }

  // 2. Category
  if (filters?.categoryId && filters.categoryId !== "") {
    filterConditions.push({
      idDanhMuc: filters.categoryId,
    });
  }

  // 3. Level
  if (filters?.levelId && filters.levelId !== "") {
    filterConditions.push({
      idCapDo: filters.levelId,
    });
  }

  // 4. Tab Logic
  if (tab === "free") {
    filterConditions.push({
      gia: 0,
    });
  } else if (tab === "purchased") {
    filterConditions.push({
      OR: [
        { idNguoiDung: userId }, 
        {
          dangKyHocs: {
            some: {
              idNguoiDung: userId,
              trangThai: "DaThanhToan",
            },
          },
        },
      ],
    });
  }

  // ✅ SHARED where condition for both count() and findMany()
  const whereCondition: Prisma.KhoaHocWhereInput = {
    AND: [accessCondition, ...filterConditions],
  };

  // ✅ Count total FIRST (same filters)
  const totalCourses = await prisma.khoaHoc.count({
    where: whereCondition,
  });

  // ✅ Calculate pagination
  const totalPages = Math.ceil(totalCourses / pageSize);
  
  // ✅ Edge case: page > totalPages → use last page (or 1 if no results)
  let currentPage = requestedPage;
  if (totalPages > 0 && currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (totalPages === 0) {
    currentPage = 1;
  }

  const skip = (currentPage - 1) * pageSize;

  // ✅ Fetch paginated courses
  const courses = await prisma.khoaHoc.findMany({
    where: whereCondition,
    orderBy: { ngayTao: "desc" },
    skip: skip,
    take: pageSize,
    select: {
      id: true,
      tenKhoaHoc: true,
      gia: true,
      moTaNgan: true,
      duongDan: true,
      capDo: true,
      thoiLuong: true,
      danhMuc: true,
      tepKH: true,
      idNguoiDung: true,
      trangThai: true,
      danhMucRef: {
        select: {
          id: true,
          tenDanhMuc: true,
          danhMucCha: {
            select: { id: true, tenDanhMuc: true },
          },
        },
      },
      capDoRef: {
        select: { id: true, tenCapDo: true },
      },
      nguoiDung: {
        select: { id: true, name: true, image: true },
      },
      danhGias: {
        where: { trangThai: "HIEN" },
        select: { diemDanhGia: true },
      },
    },
  });

  const coursesWithOwnership = courses.map((course) => ({
    ...course,
    isOwner: userId ? course.idNguoiDung === userId : false,
    isArchived: course.trangThai === "BanLuuTru",
  }));

  return {
    courses: coursesWithOwnership,
    totalCourses,
    totalPages,
    currentPage,
    pageSize,
  };
}

export type CourseWithOwnership = {
  id: string;
  tenKhoaHoc: string;
  gia: number;
  moTaNgan: string;
  duongDan: string;
  capDo: string;
  thoiLuong: number;
  danhMuc: string | null;
  tepKH: string;
  idNguoiDung: string;
  trangThai: string;
  danhMucRef: {
    id: string;
    tenDanhMuc: string;
    danhMucCha: { id: string; tenDanhMuc: string } | null;
  } | null;
  capDoRef: { id: string; tenCapDo: string } | null;
  nguoiDung: { id: string; name: string | null; image: string | null };
  danhGias: { diemDanhGia: number }[];
  isOwner: boolean;
  isArchived: boolean;
};

// ✅ Đếm khóa học công khai (for Smart Empty State)
export async function countAllCourses(filters?: CourseFilterParams) {
  const filterConditions: Prisma.KhoaHocWhereInput[] = [];

  // 1. Keyword
  if (filters?.keyword && filters.keyword.trim() !== "") {
    filterConditions.push({
      tenKhoaHoc: {
        contains: filters.keyword.trim(),
        mode: "insensitive",
      },
    });
  }

  // 2. Category
  if (filters?.categoryId && filters.categoryId !== "") {
    filterConditions.push({
      idDanhMuc: filters.categoryId,
    });
  }

  // 3. Level
  if (filters?.levelId && filters.levelId !== "") {
    filterConditions.push({
      idCapDo: filters.levelId,
    });
  }

  const whereCondition: Prisma.KhoaHocWhereInput = {
    AND: [
      { trangThai: "BanChinhThuc" },
      ...filterConditions,
    ],
  };

  return prisma.khoaHoc.count({
    where: whereCondition,
  });
}

