import "server-only";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getAllCoursesWithOwnership() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;

  const courses = await prisma.khoaHoc.findMany({
    where: { trangThai: "BanChinhThuc" },
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
      idNguoiDung: true, // For ownership check
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

  // Add ownership flag
  return courses.map((course) => ({
    ...course,
    isOwner: userId ? course.idNguoiDung === userId : false,
  }));
}

export type CourseWithOwnership = Awaited<
  ReturnType<typeof getAllCoursesWithOwnership>
>[0];
