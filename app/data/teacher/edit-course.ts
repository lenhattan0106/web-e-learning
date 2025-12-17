import "server-only";
import { requireTeacher } from "./require-teacher";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export async function TeacherEditCourse(id: string) {
  const session = await requireTeacher();
  
  const data = await prisma.khoaHoc.findUnique({
    where: {
      id: id,
      idNguoiDung: session.user.id, // Chỉ cho phép teacher edit courses của mình
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      moTa: true,
      tepKH: true,
      gia: true,
      thoiLuong: true,
      capDo: true,
      trangThai: true,
      duongDan: true,
      moTaNgan: true,
      danhMuc: true,
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