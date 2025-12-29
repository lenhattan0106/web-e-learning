"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function recalculateCourseDuration(courseId: string) {
  try {
    const lessons = await prisma.baiHoc.findMany({
      where: {
        chuong: {
          idKhoaHoc: courseId,
        },
      },
      select: {
          thoiLuong: true
      }
    });

    const totalDuration = lessons.reduce((acc, lesson) => acc + (lesson.thoiLuong || 0), 0);

    await prisma.khoaHoc.update({
      where: { id: courseId },
      data: {
        thoiLuong: totalDuration,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return { success: true, totalDuration };
  } catch (error) {
    console.error("Lỗi khi tính lại thời lượng khóa học:", error);
    return { error: "Lỗi khi tính lại thời lượng khóa học" };
  }
}
