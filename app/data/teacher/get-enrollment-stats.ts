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
    // startOf('day') logic could be more robust with libraries, but this works for basic daily grouping
    // converting to YYYY-MM-DD
    const enrollmentDate = new Date(dangKyHoc.ngayTao);
    // Adjust logic to match local timezone if needed, but keeping it simple UTC/Server time for now consistent with loop
    // Using local date string part comparison to match the loop generation above
    // Note: The loop generate local dates. database returns UTC dates usually. 
    // Ideally we normalize everything to the same timezone. 
    // For simplicity in this context, we'll try to match by YYYY-MM-DD string.
    
    // To be safe regarding timezones, let's just use the string format used in generating the array:
    // This is a naive date match. 
    const dateString = enrollmentDate.toLocaleDateString("en-CA");

    const dayStat = dailyStats.find((day) => day.date === dateString);
    if (dayStat) {
      dayStat.enrollments++;
      dayStat.revenue += dangKyHoc.soTien;
    }
  });

  return dailyStats;
}
