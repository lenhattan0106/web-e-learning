"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getDanhMucs() {
  const categories = await prisma.danhMuc.findMany({
    orderBy: { tenDanhMuc: "asc" },
    include: {
      danhMucCon: {
        orderBy: { tenDanhMuc: "asc" },
        include: {
            danhMucCon: {
                orderBy: { tenDanhMuc: "asc" }
            }
        }
      },
    },
    where: {
        idDanhMucCha: null // Root categories
    }
  });
  return categories;
}

export async function createQuickDanhMuc(tenDanhMuc: string, idDanhMucCha?: string) {
  const session = await requireTeacher();
  
  if (!tenDanhMuc || tenDanhMuc.trim().length === 0) {
      return { error: "Tên danh mục không hợp lệ" };
  }

  try {
      const slug = tenDanhMuc
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");

      const existing = await prisma.danhMuc.findUnique({
          where: { duongDan: slug }
      });

      if (existing) {
          return { error: "Danh mục này đã tồn tại" };
      }

      const category = await prisma.danhMuc.create({
          data: {
              tenDanhMuc,
              duongDan: slug,
              idDanhMucCha: idDanhMucCha || null
          }
      });
      
      revalidatePath("/teacher/courses");
      revalidatePath("/teacher/courses/create");
      revalidatePath("/teacher/courses/[courseId]/edit", "page");
      return { success: true, data: category };
  } catch (error) {
      console.error("Error creating category:", error);
      return { error: "Không thể tạo danh mục" };
  }
}

export async function editDanhMuc(id: string, tenDanhMuc: string) {
  const session = await requireTeacher();
  
  if (!tenDanhMuc || tenDanhMuc.trim().length === 0) {
      return { error: "Tên danh mục không hợp lệ" };
  }

  try {
      const slug = tenDanhMuc
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");

      const existing = await prisma.danhMuc.findFirst({
          where: { 
              duongDan: slug,
              id: { not: id }
          }
      });

      if (existing) {
          return { error: "Danh mục với tên này đã tồn tại" };
      }

      const category = await prisma.danhMuc.update({
          where: { id },
          data: {
              tenDanhMuc,
              duongDan: slug
          }
      });
      
      revalidatePath("/teacher/courses");
      revalidatePath("/teacher/courses/create");
      revalidatePath("/teacher/courses/[courseId]/edit", "page");
      return { success: true, data: category };
  } catch (error) {
      console.error("Error editing category:", error);
      return { error: "Không thể cập nhật danh mục" };
  }
}

export async function deleteDanhMuc(id: string) {
  const session = await requireTeacher();

  try {
      // Check if category has children
      const children = await prisma.danhMuc.count({
          where: { idDanhMucCha: id }
      });

      if (children > 0) {
          return { error: "Không thể xóa danh mục có danh mục con" };
      }

      // Check if category is used in courses
      const coursesCount = await prisma.khoaHoc.count({
          where: { idDanhMuc: id }
      });

      if (coursesCount > 0) {
          return { error: "Không thể xóa danh mục đang được sử dụng trong khóa học" };
      }

      await prisma.danhMuc.delete({
          where: { id }
      });
      
      revalidatePath("/teacher/courses");
    revalidatePath("/teacher/courses/create");
    revalidatePath("/teacher/courses/[courseId]/edit", "page");
    return { success: true };
  } catch (error) {
      console.error("Error deleting category:", error);
      return { error: "Không thể xóa danh mục" };
  }
}
