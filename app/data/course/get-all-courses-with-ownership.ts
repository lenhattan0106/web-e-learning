import "server-only";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";


export interface CourseFilterParams {
  keyword?: string;
  categoryId?: string;
  levelId?: string;
  tab?: string; // "all" | "free" | "purchased"
}


interface SessionUser {
  id: string;
  role: string | null | undefined;
}

export async function getAllCoursesWithOwnership(filters?: CourseFilterParams, sessionUser?: SessionUser) {
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

  if (tab === "purchased" && !userId) {
    return [];
  }

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

  const whereCondition: Prisma.KhoaHocWhereInput = {
    AND: [accessCondition, ...filterConditions],
  };

  const courses = await prisma.khoaHoc.findMany({
    where: whereCondition,
    orderBy: { ngayTao: "desc" },
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

  return courses.map((course) => ({
    ...course,
    isOwner: userId ? course.idNguoiDung === userId : false,
    isArchived: course.trangThai === "BanLuuTru",
  }));
}

export type CourseWithOwnership = Awaited<
  ReturnType<typeof getAllCoursesWithOwnership>
>[0];

// Đếm khóa học công khai 
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
