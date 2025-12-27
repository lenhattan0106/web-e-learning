
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getRevenueAnalyticsTool = tool({
  description: "Calculate total revenue and revenue per course for the instructor. Use this when a teacher asks about 'revenue', 'earnings', or 'how much money I made'.",
  inputSchema: z.object({
    instructorId: z.string().describe("The ID of the instructor."),
  }),
  execute: async ({ instructorId }) => {
    try {
      if (!instructorId || instructorId === 'guest') {
         return { error: "Auth required." };
      }

      const courses = await prisma.khoaHoc.findMany({
        where: { idNguoiDung: instructorId },
        select: {
          tenKhoaHoc: true,
          dangKyHocs: {
            where: { trangThai: "DaThanhToan" }, // Only count paid enrollments
            select: { soTien: true }
          }
        }
      });

      let totalRevenue = 0;
      const revenueByCourse = courses.map(course => {
        const courseRevenue = course.dangKyHocs.reduce((sum, enrollment) => sum + enrollment.soTien, 0);
        totalRevenue += courseRevenue;
        return {
          course: course.tenKhoaHoc,
          revenue: courseRevenue,
          salesCount: course.dangKyHocs.length
        };
      });

      return {
        totalRevenue,
        revenueByCourse
      };

    } catch (error) {
      console.error("Get revenue analytics error:", error);
      return { error: "Failed to calculate revenue." };
    }
  },
});
