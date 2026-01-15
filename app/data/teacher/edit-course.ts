import "server-only";
import { requireTeacher } from "./require-teacher";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export async function TeacherEditCourse(id: string) {
  const session = await requireTeacher();
  
  const data = await prisma.khoaHoc.findUnique({
    where: {
      id: id,
      // If admin, bypass ownership check. If teacher, strict check.
      ...(session.user.role === "admin" ? {} : { idNguoiDung: session.user.id }),
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      moTa: true,
      tepKH: true,
      gia: true,
      thoiLuong: true,
      duongDan: true,
      moTaNgan: true,
      
      // Use new relation IDs
      idDanhMuc: true,
      idCapDo: true,
      trangThai: true,
      
      // Count paid enrollments for UI protection
      _count: {
        select: {
          dangKyHocs: {
            where: { trangThai: "DaThanhToan" }
          }
        }
      },
      
      chuongs: {
        orderBy: {
          thuTu: "asc",
        },
        select: {
          id: true,
          tenChuong: true,
          thuTu: true,
          baiHocs: {
            orderBy: {
              thuTu: "asc",
            },
            select: {
              id: true,
              tenBaiHoc: true,
              moTa: true,
              anhBaiHoc: true,
              thuTu: true,
              maVideo: true,
              thoiLuong: true, // Add duration for calculation
            },
          },
        },
      },
    },
  });
  
  if (!data) {
    // Course không tồn tại hoặc không thuộc về teacher này
    redirect("/not-teacher");
  }
  
  return data;
}

export type TeacherEditCourseType = Awaited<ReturnType<typeof TeacherEditCourse>>;