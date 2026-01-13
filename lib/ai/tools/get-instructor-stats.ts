
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getInstructorStatsTool = tool({
  description: "Lấy thống kê cho Giảng viên. Trả về tổng số học viên đã đăng ký khóa học. SỬ DỤNG KHI giảng viên hỏi: 'tôi có bao nhiêu học viên', 'thống kê của tôi', 'số học viên'.",
  inputSchema: z.object({
    instructorId: z.string().describe("ID của giảng viên (lấy từ system context)"),
  }),
  execute: async ({ instructorId }) => {
    if (!instructorId || instructorId === 'user_id_test') {
       // Mock for testing if no real teacher ID
       // In real app, return error or mock data
       // return { error: "Invalid instructor ID" };
    }

    try {
        // Find courses owned by this instructor
        const myCourses = await prisma.khoaHoc.findMany({
            where: { idNguoiDung: instructorId },
            select: { id: true }
        });

        const courseIds = myCourses.map(c => c.id);

        if (courseIds.length === 0) {
            return { totalStudents: 0, activeCourses: 0, message: "You haven't created any courses yet." };
        }

        // Count enrollments in these courses
        const totalEnrollments = await prisma.dangKyHoc.count({
            where: {
                idKhoaHoc: { in: courseIds },
                trangThai: "DaThanhToan"
            }
        });

        return {
            totalStudents: totalEnrollments,
            activeCourses: courseIds.length
        };

    } catch (error) {
      console.error("Instructor stats error:", error);
      return { error: "Failed to get instructor stats." };
    }
  },
});
