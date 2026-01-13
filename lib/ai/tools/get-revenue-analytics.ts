
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getRevenueAnalyticsTool = tool({
  description: "Tính toán doanh thu theo từng khóa học cho Giảng viên. SỬ DỤNG KHI giảng viên hỏi: 'doanh thu', 'thu nhập', 'kiếm được bao nhiêu', 'phân tích doanh thu'.",
  inputSchema: z.object({
    instructorId: z.string().describe("ID của giảng viên (lấy từ system context)"),
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
