
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getDetailedInstructorDataTool = tool({
  description: "Lấy danh sách chi tiết học viên đã đăng ký khóa học của Giảng viên. Trả về: tên, email, tên khóa học, ngày đăng ký, trạng thái. SỬ DỤNG KHI giảng viên hỏi: 'học viên của tôi là ai?', 'danh sách đăng ký', 'ai đã mua khóa học'.",
  inputSchema: z.object({
    instructorId: z.string().describe("ID của giảng viên (lấy từ system context)"),
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
