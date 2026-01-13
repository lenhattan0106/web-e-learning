import "server-only";
import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";

export async function teacherGetCourses() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const session = await requireTeacher();
  
  const data = await prisma.khoaHoc.findMany({
    where: {
      idNguoiDung: session.user.id, // Chỉ lấy courses của teacher này
    },
    orderBy: {
      ngayTao: "desc",
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      moTaNgan: true,
      thoiLuong: true,
      capDo: true,
      trangThai: true,
      danhMuc: true,
      gia: true,
      tepKH: true,
      duongDan: true,
    },
  });
  
  return data;
}

export type TeacherCourseType = Awaited<ReturnType<typeof teacherGetCourses>>[0];