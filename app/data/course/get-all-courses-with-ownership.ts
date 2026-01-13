import "server-only";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

export interface CourseFilterParams {
  keyword?: string;
  categoryId?: string;
  levelId?: string;
}

export async function getAllCoursesWithOwnership(filters?: CourseFilterParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  // Tạo điều kiện where động cho quyền truy cập
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
          trangThai: { in: ["BanLuuTru", "BiChan"] }, // Owner sees Draft/Archived/Banned
          idNguoiDung: userId,
        },
        {
          trangThai: "BanLuuTru",
          dangKyHocs: {
            some: {
              idNguoiDung: userId,
              trangThai: "DaThanhToan", 
              //học viên đã mua khóa học
            },
          },
        },
      ],
    };
  }

  // Tạo điều kiện filter từ params
  const filterConditions: Prisma.KhoaHocWhereInput[] = [];

  if (filters?.keyword && filters.keyword.trim() !== "") {
    filterConditions.push({
      tenKhoaHoc: {
        contains: filters.keyword.trim(),
        mode: "insensitive",
      },
    });
  }

  if (filters?.categoryId && filters.categoryId !== "") {
    filterConditions.push({
      idDanhMuc: filters.categoryId,
    });
  }

  if (filters?.levelId && filters.levelId !== "") {
    filterConditions.push({
      idCapDo: filters.levelId,
    });
  }

  // Kết hợp điều kiện access và filter
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
