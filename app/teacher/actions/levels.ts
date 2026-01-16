"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";

export async function getCapDos() {
  const levels = await prisma.capDo.findMany({
    orderBy: { tenCapDo: "asc" },
  });
  return levels;
}

export async function createQuickCapDo(tenCapDo: string) {
  const session = await requireTeacher();

  if (!tenCapDo || tenCapDo.trim().length === 0) {
      return { error: "Tên cấp độ không hợp lệ" };
  }

  try {
      const code = tenCapDo
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^\w\_]+/g, "");

      const existing = await prisma.capDo.findUnique({
          where: { maCapDo: code }
      });

      if (existing) {
          return { error: "Cấp độ này đã tồn tại" };
      }

      const level = await prisma.capDo.create({
          data: {
              tenCapDo,
              maCapDo: code,
          }
      });
      
      revalidateTag("levels", "default");
      revalidatePath("/teacher/courses");
      revalidatePath("/teacher/courses/create");
      revalidatePath("/teacher/courses/[courseId]/edit", "page");
      return { success: true, data: level };
  } catch (error) {
       console.error("Error creating level:", error);
      return { error: "Không thể tạo cấp độ" };
  }
}

export async function editCapDo(id: string, tenCapDo: string) {
  const session = await requireTeacher();
  
  if (!tenCapDo || tenCapDo.trim().length === 0) {
      return { error: "Tên cấp độ không hợp lệ" };
  }

  try {
      const coursesWithLevel = await prisma.khoaHoc.findMany({
        where: { idCapDo: id },
        select: { id: true, idNguoiDung: true }
      });

      if (coursesWithLevel.length > 0) {
        const enrollmentCount = await prisma.dangKyHoc.count({
          where: {
            idKhoaHoc: { in: coursesWithLevel.map(c => c.id) },
            trangThai: "DaThanhToan"
          }
        });

        const uniqueTeachers = new Set(coursesWithLevel.map(c => c.idNguoiDung));
        return {
          locked: true,
          impact: {
            courses: coursesWithLevel.length,
            students: enrollmentCount,
            teachers: uniqueTeachers.size
          }
        };
      }

      const level = await prisma.capDo.update({
          where: { id },
          data: { tenCapDo }
      });
      
      revalidateTag("levels", "default");
      revalidatePath("/teacher/courses");
      return { success: true, data: level };
  } catch (error) {
      console.error("Error editing level:", error);
      return { error: "Không thể cập nhật cấp độ" };
  }
}

export async function deleteCapDo(id: string) {
  const session = await requireTeacher();

  try {
      const coursesWithLevel = await prisma.khoaHoc.findMany({
        where: { idCapDo: id },
        select: { id: true, idNguoiDung: true }
      });

      if (coursesWithLevel.length > 0) {
        const enrollmentCount = await prisma.dangKyHoc.count({
          where: {
            idKhoaHoc: { in: coursesWithLevel.map(c => c.id) },
            trangThai: "DaThanhToan"
          }
        });

        const uniqueTeachers = new Set(coursesWithLevel.map(c => c.idNguoiDung));
        return {
          locked: true,
          impact: {
            courses: coursesWithLevel.length,
            students: enrollmentCount,
            teachers: uniqueTeachers.size
          }
        };
      }

      await prisma.capDo.delete({
          where: { id }
      });
      
      revalidateTag("levels", "default");
      revalidatePath("/teacher/courses");
      return { success: true };
  } catch (error) {
      console.error("Error deleting level:", error);
      return { error: "Không thể xóa cấp độ" };
  }
}
