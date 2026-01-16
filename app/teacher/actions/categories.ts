"use server";

import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";

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
        idDanhMucCha: null 
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
      
      revalidateTag("categories", "default");
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
      const coursesInCategory = await prisma.khoaHoc.findMany({
        where: {
          OR: [
            { idDanhMuc: id },
            { danhMucRef: { idDanhMucCha: id } }
          ]
        },
        select: { id: true, idNguoiDung: true }
      });

      if (coursesInCategory.length > 0) {
        const enrollmentCount = await prisma.dangKyHoc.count({
          where: {
            idKhoaHoc: { in: coursesInCategory.map(c => c.id) },
            trangThai: "DaThanhToan"
          }
        });

        if (enrollmentCount > 0) {
          const uniqueTeachers = new Set(coursesInCategory.map(c => c.idNguoiDung));
          return {
            locked: true,
            impact: {
              courses: coursesInCategory.length,
              students: enrollmentCount,
              teachers: uniqueTeachers.size
            }
          };
        }
      }
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
      
      revalidateTag("categories", "default");
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
          return { error: "Không thể xóa danh mục có danh mục con. Vui lòng xóa danh mục con trước." };
      }

      // ===== ENROLLMENT PROTECTION =====
      // 1. Get courses in this category
       const coursesInCategory = await prisma.khoaHoc.findMany({
        where: { idDanhMuc: id },
        select: { id: true, tenKhoaHoc: true, idNguoiDung: true }
      });

      if (coursesInCategory.length > 0) {
        const enrollmentCount = await prisma.dangKyHoc.count({
          where: {
            idKhoaHoc: { in: coursesInCategory.map(c => c.id) },
            trangThai: "DaThanhToan"
          }
        });

        if (enrollmentCount > 0) {
          const uniqueTeachers = new Set(coursesInCategory.map(c => c.idNguoiDung));
          return {
            locked: true,
            impact: {
              courses: coursesInCategory.length,
              students: enrollmentCount,
              teachers: uniqueTeachers.size
            }
          };
        }

        return {
          error: `Danh mục đang có ${coursesInCategory.length} khóa học. Vui lòng chuyển sang danh mục khác trước khi xóa.`
        };
      }
      // ===== END PROTECTION =====

      await prisma.danhMuc.delete({
          where: { id }
      });
      
      revalidateTag("categories", "default");
      revalidatePath("/teacher/courses");
      revalidatePath("/teacher/courses/create");
      revalidatePath("/teacher/courses/[courseId]/edit", "page");
    return { success: true };
  } catch (error) {
      console.error("Error deleting category:", error);
      return { error: "Không thể xóa danh mục" };
  }
}
