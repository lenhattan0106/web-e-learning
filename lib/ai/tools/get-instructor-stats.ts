
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getInstructorStatsTool = tool({
  description: "Get statistics for an instructor (teacher). Returns total students enrolled in their courses. Use this when a teacher asks 'how many students do I have' or 'my stats'.",
  inputSchema: z.object({
    instructorId: z.string().describe("The ID of the instructor/teacher."),
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
