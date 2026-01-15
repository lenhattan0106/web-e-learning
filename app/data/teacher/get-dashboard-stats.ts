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
  const calculateNetRevenue = (enrollments: { soTien: number | null; thanhToanThuc: number | null; phiSan: number | null }[]) => {
    return enrollments.reduce((sum, e) => {
      const gross = e.soTien || 0;
      const platformFee = e.phiSan ?? Math.round(gross * 0.05);
      const net = e.thanhToanThuc ?? (gross - platformFee);
      return sum + net;
    }, 0);
  };

  const getStatsForPeriod = async (start: Date, end: Date) => {
    const [enrollments, users] = await Promise.all([
        prisma.dangKyHoc.findMany({
            where: {
                khoaHoc: { idNguoiDung: userId },
                trangThai: "DaThanhToan",
                ngayTao: { gte: start, lt: end }
            },
            select: { soTien: true, thanhToanThuc: true, phiSan: true }
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
        revenue: calculateNetRevenue(enrollments),
        newStudents: users.length
    };
  };

  const currentPeriodStats = await getStatsForPeriod(startDate, now);
  const previousPeriodStats = await getStatsForPeriod(previousStartDate, startDate);

  const [allEnrollments, totalUsers, totalCourses, totalLessons] = await Promise.all([
    prisma.dangKyHoc.findMany({
      where: {
        khoaHoc: { idNguoiDung: userId },
        trangThai: "DaThanhToan",
      },
      select: { soTien: true, thanhToanThuc: true, phiSan: true },
    }),
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
    prisma.khoaHoc.count({ where: { idNguoiDung: userId } }),
    prisma.baiHoc.count({
      where: { chuong: { khoaHoc: { idNguoiDung: userId } } },
    }),
  ]);

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    totalRevenue: calculateNetRevenue(allEnrollments), 
    totalUsers,
    totalCourses,
    totalLessons,
    revenueGrowth: calculateGrowth(currentPeriodStats.revenue, previousPeriodStats.revenue),
    usersGrowth: calculateGrowth(currentPeriodStats.newStudents, previousPeriodStats.newStudents)
  };
}
