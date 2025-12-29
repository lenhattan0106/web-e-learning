import "server-only";
import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";

export async function teacherGetDashBoardStatus(duration: number = 30) {
  const session = await requireTeacher();
  const userId = session.user.id;

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - duration);
  
  const previousStartDate = new Date();
  previousStartDate.setDate(startDate.getDate() - duration);

  // Helper to fetch stats for a date range
  const getStatsForPeriod = async (start: Date, end: Date) => {
    const [revenue, users] = await Promise.all([
        prisma.dangKyHoc.aggregate({
            where: {
                khoaHoc: { idNguoiDung: userId },
                trangThai: "DaThanhToan",
                ngayTao: { gte: start, lt: end }
            },
            _sum: { soTien: true }
        }),
        
         prisma.dangKyHoc.findMany({
            where: {
                khoaHoc: { idNguoiDung: userId },
                trangThai: "DaThanhToan",
                ngayTao: { gte: start, lt: end }
            },
            distinct: ['idNguoiDung'],
            select: { idNguoiDung: true }
        })
    ]);
    return {
        revenue: revenue._sum.soTien || 0,
        newStudents: users.length
    };
  };

  const currentPeriodStats = await getStatsForPeriod(startDate, now);
  const previousPeriodStats = await getStatsForPeriod(previousStartDate, startDate);

  // Totals (Cumulative) - as originally requested
  const [totalRevenue, totalUsers, totalCourses, totalLessons] = await Promise.all([
    // Total Revenue (All time)
    prisma.dangKyHoc.aggregate({
      where: {
        khoaHoc: { idNguoiDung: userId },
        trangThai: "DaThanhToan",
      },
      _sum: { soTien: true },
    }),
    // Total Users (All time)
     prisma.user.count({
      where: {
        dangKyHocs: {
          some: {
            khoaHoc: { idNguoiDung: userId },
            trangThai: "DaThanhToan",
          },
        },
      },
    }),
     // Total Courses
    prisma.khoaHoc.count({ where: { idNguoiDung: userId } }),
    // Total Lessons
    prisma.baiHoc.count({
      where: { chuong: { khoaHoc: { idNguoiDung: userId } } },
    }),
  ]);

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    totalRevenue: totalRevenue._sum.soTien || 0,
    totalUsers,
    totalCourses,
    totalLessons,
    // Growth stats based on the selected duration (comparing current duration window vs previous duration window)
    revenueGrowth: calculateGrowth(currentPeriodStats.revenue, previousPeriodStats.revenue),
    usersGrowth: calculateGrowth(currentPeriodStats.newStudents, previousPeriodStats.newStudents)
  };
}
