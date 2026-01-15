"use server";

import { prisma } from "@/lib/db";

/**
 * Check if a course has paid enrollments
 * Used across the app to determine if content can be deleted
 */
export async function isCourseLocked(courseId: string): Promise<boolean> {
  const count = await prisma.dangKyHoc.count({
    where: {
      idKhoaHoc: courseId,
      trangThai: "DaThanhToan"
    }
  });
  
  return count > 0;
}

/**
 * Get enrollment count for a course
 */
export async function getEnrollmentCount(courseId: string): Promise<number> {
  return await prisma.dangKyHoc.count({
    where: {
      idKhoaHoc: courseId,
      trangThai: "DaThanhToan"
    }
  });
}

/**
 * Get all enrolled student IDs for a course
 */
export async function getEnrolledStudentIds(courseId: string): Promise<string[]> {
  const enrollments = await prisma.dangKyHoc.findMany({
    where: {
      idKhoaHoc: courseId,
      trangThai: "DaThanhToan"
    },
    select: {
      idNguoiDung: true
    }
  });
  
  return enrollments.map(e => e.idNguoiDung);
}

/**
 * Calculate impact of changing a category
 */
export async function calculateCategoryImpact(categoryId: string) {
  // Get courses in this category (direct + children)
  const coursesInCategory = await prisma.khoaHoc.findMany({
    where: {
      OR: [
        { idDanhMuc: categoryId },
        { danhMucRef: { idDanhMucCha: categoryId } }
      ]
    },
    select: {
      id: true,
      idNguoiDung: true
    }
  });

  // Get unique teacher count
  const uniqueTeachers = new Set(coursesInCategory.map(c => c.idNguoiDung));

  // Count total enrollments
  const enrollmentCount = await prisma.dangKyHoc.count({
    where: {
      idKhoaHoc: { in: coursesInCategory.map(c => c.id) },
      trangThai: "DaThanhToan"
    }
  });

  return {
    courses: coursesInCategory.length,
    students: enrollmentCount,
    teachers: uniqueTeachers.size
  };
}

/**
 * Calculate impact of changing a level
 */
export async function calculateLevelImpact(levelId: string) {
  const coursesWithLevel = await prisma.khoaHoc.findMany({
    where: { idCapDo: levelId },
    select: {
      id: true,
      idNguoiDung: true
    }
  });

  const uniqueTeachers = new Set(coursesWithLevel.map(c => c.idNguoiDung));

  const enrollmentCount = await prisma.dangKyHoc.count({
    where: {
      idKhoaHoc: { in: coursesWithLevel.map(c => c.id) },
      trangThai: "DaThanhToan"
    }
  });

  return {
    courses: coursesWithLevel.length,
    students: enrollmentCount,
    teachers: uniqueTeachers.size
  };
}
