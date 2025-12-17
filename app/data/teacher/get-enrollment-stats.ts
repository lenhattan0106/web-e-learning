import "server-only";

import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";

export async function teacherGetEnrollmentStats() {
  const session = await requireTeacher();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Chỉ lấy enrollments của courses thuộc teacher này
  const dangKyHocs = await prisma.dangKyHoc.findMany({
    where: {
      khoaHoc: {
        idNguoiDung: session.user.id, // Filter courses của teacher
      },
      ngayTao: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      ngayTao: true,
    },
    orderBy: {
      ngayTao: "asc",
    },
  });

  const last30days: { date: string; enrollments: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last30days.push({
      date: date.toISOString().split("T")[0],
      enrollments: 0,
    });
  }

  dangKyHocs.forEach((dangKyHoc) => {
    const enrollmentDate = dangKyHoc.ngayTao.toISOString().split("T")[0];
    const dayIndex = last30days.findIndex((day) => day.date === enrollmentDate);
    if (dayIndex !== -1) {
      last30days[dayIndex].enrollments++;
    }
  });

  return last30days;
}
