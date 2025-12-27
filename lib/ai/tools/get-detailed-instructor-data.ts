
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getDetailedInstructorDataTool = tool({
  description: "Get detailed list of students enrolled in the instructor's courses. Returns student name, email, course name, enrollment date, and status. Use this when a teacher asks 'Who are my students?' or 'List my enrollments'.",
  inputSchema: z.object({
    instructorId: z.string().describe("The ID of the instructor/teacher."),
  }),
  execute: async ({ instructorId }) => {
    try {
      if (!instructorId || instructorId === 'guest') {
         return { error: "You must be logged in as a teacher to view this data." };
      }

      const courses = await prisma.khoaHoc.findMany({
        where: { idNguoiDung: instructorId },
        select: {
          tenKhoaHoc: true,
          dangKyHocs: {
            select: {
              nguoiDung: {
                select: {
                  name: true,
                  email: true,
                },
              },
              ngayTao: true,
              trangThai: true,
              soTien: true
            },
          },
        },
      });

      // Flatten the data for the AI to easily parse and format
      const flattenedData = courses.flatMap(course => 
        course.dangKyHocs.map(enrollment => ({
          courseName: course.tenKhoaHoc,
          studentName: enrollment.nguoiDung.name,
          studentEmail: enrollment.nguoiDung.email,
          enrolledAt: enrollment.ngayTao.toISOString().split('T')[0], // YYYY-MM-DD
          status: enrollment.trangThai,
          amountPaid: enrollment.soTien
        }))
      );

      if (flattenedData.length === 0) {
        return { message: "No students found for your courses." };
      }

      return { enrollments: flattenedData };

    } catch (error) {
      console.error("Get detailed instructor data error:", error);
      return { error: "Failed to retrieve student data." };
    }
  },
});
