"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getTrangThais() {
  const statuses = await prisma.trangThaiKhoaHoc.findMany({
    orderBy: { tenTrangThai: "asc" },
  });
  return statuses;
}

export async function createQuickTrangThai(tenTrangThai: string) {
  const session = await requireTeacher();

  if (!tenTrangThai || tenTrangThai.trim().length === 0) {
      return { error: "Tên trạng thái không hợp lệ" };
  }

  try {
      const code = tenTrangThai
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^\w\_]+/g, "");

      const existing = await prisma.trangThaiKhoaHoc.findUnique({
          where: { maTrangThai: code }
      });

      if (existing) {
          return { error: "Trạng thái này đã tồn tại" };
      }

      const status = await prisma.trangThaiKhoaHoc.create({
          data: {
              tenTrangThai,
              maTrangThai: code,
          }
      });
      
      revalidatePath("/teacher/courses");
      revalidatePath("/teacher/courses/create");
      revalidatePath("/teacher/courses/[courseId]/edit", "page");
      return { success: true, data: status };
  } catch (error) {
       console.error("Error creating status:", error);
      return { error: "Không thể tạo trạng thái" };
  }
}

export async function editTrangThai(id: string, tenTrangThai: string) {
  const session = await requireTeacher();
  
  if (!tenTrangThai || tenTrangThai.trim().length === 0) {
      return { error: "Tên trạng thái không hợp lệ" };
  }

  try {
      const status = await prisma.trangThaiKhoaHoc.update({
          where: { id },
          data: { tenTrangThai }
      });
      
      revalidatePath("/teacher/courses");
      return { success: true, data: status };
  } catch (error) {
      console.error("Error editing status:", error);
      return { error: "Không thể cập nhật trạng thái" };
  }
}

export async function deleteTrangThai(id: string) {
  const session = await requireTeacher();

  try {
      // Check if status is used in courses
      const coursesCount = await prisma.khoaHoc.count({
          where: { idTrangThai: id }
      });

      if (coursesCount > 0) {
          return { error: "Không thể xóa trạng thái đang được sử dụng trong khóa học" };
      }

      await prisma.trangThaiKhoaHoc.delete({
          where: { id }
      });
      
      revalidatePath("/teacher/courses");
      return { success: true };
  } catch (error) {
      console.error("Error deleting status:", error);
      return { error: "Không thể xóa trạng thái" };
  }
}
