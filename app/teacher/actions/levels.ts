"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
      const level = await prisma.capDo.update({
          where: { id },
          data: { tenCapDo }
      });
      
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
      // Check if level is used in courses
      const coursesCount = await prisma.khoaHoc.count({
          where: { idCapDo: id }
      });

      if (coursesCount > 0) {
          return { error: "Không thể xóa cấp độ đang được sử dụng trong khóa học" };
      }

      await prisma.capDo.delete({
          where: { id }
      });
      
      revalidatePath("/teacher/courses");
      return { success: true };
  } catch (error) {
      console.error("Error deleting level:", error);
      return { error: "Không thể xóa cấp độ" };
  }
}
