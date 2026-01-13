import "server-only";

import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";

export async function teacherGetEnrollmentStats(duration: number = 30) {
  const session = await requireTeacher();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - duration);

  // Chỉ lấy enrollments của courses thuộc teacher này
  const dangKyHocs = await prisma.dangKyHoc.findMany({
    where: {
      khoaHoc: {
        idNguoiDung: session.user.id, // Filter courses của teacher
      },
      ngayTao: {
        gte: startDate,
      },
      trangThai: "DaThanhToan", // Chỉ tính đơn đã thanh toán cho revenue chuẩn
    },
    select: {
      ngayTao: true,
      soTien: true,
    },
    orderBy: {
      ngayTao: "asc",
    },
  });

  const dailyStats: { date: string; enrollments: number; revenue: number }[] = [];
  
  // Create array of dates for the duration
  for (let i = duration - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dailyStats.push({
      date: date.toLocaleDateString("en-CA"), // YYYY-MM-DD format matches simple ISO date part
      enrollments: 0,
      revenue: 0,
    });
  }

  dangKyHocs.forEach((dangKyHoc) => {
    const enrollmentDate = new Date(dangKyHoc.ngayTao);
    const dateString = enrollmentDate.toLocaleDateString("en-CA");

    const dayStat = dailyStats.find((day) => day.date === dateString);
    if (dayStat) {
      dayStat.enrollments++;
      dayStat.revenue += dangKyHoc.soTien;
    }
  });

  return dailyStats;
}
