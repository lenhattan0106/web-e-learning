import "server-only";
import { prisma } from "@/lib/db";
import { requireAdmin } from "./required-admin";

export async function teacherGetDashBoardStatus() {
  await requireAdmin();
  
  const [totalRevenue, totalUsers, totalCourses, totalLessons] = await Promise.all([
    prisma.enrollment.aggregate({
      where: {
        status: "DaThanhToan",
      },
      _sum: {
        amount: true,
      },
    }),
    
    prisma.user.count({
      where: {
        enrollment: {
          some: {
            status: "DaThanhToan",
          },
        },
      },
    }),
    
    prisma.course.count(),
    
    prisma.lesson.count(),
  ]);

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    totalUsers,
    totalCourses,
    totalLessons,
  };
}
