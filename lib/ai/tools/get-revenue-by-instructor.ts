/**
 * Get Revenue By Instructor Tool (for Admin)
 * 
 * Returns revenue breakdown by each instructor
 * Dùng khi Admin hỏi: "doanh thu theo giảng viên", "giảng viên nào kiếm nhiều nhất"
 */

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getRevenueByInstructorTool = tool({
  description: "Lấy doanh thu phân tích theo TỪNG GIẢNG VIÊN. SỬ DỤNG KHI Admin hỏi: 'doanh thu theo giảng viên', 'giảng viên nào kiếm nhiều nhất', 'ai có doanh thu cao nhất', 'phân tích theo giáo viên'.",
  inputSchema: z.object({
    limit: z.number().optional().describe("Số lượng giảng viên tối đa, mặc định 10"),
  }),
  execute: async ({ limit = 10 }) => {
    try {
      // Get all teachers with their courses and enrollments
      const instructors = await prisma.user.findMany({
        where: { role: "teacher" },
        select: {
          id: true,
          name: true,
          email: true,
          khoaHocs: {
            select: {
              tenKhoaHoc: true,
              gia: true,
              dangKyHocs: {
                where: { trangThai: "DaThanhToan" },
                select: { 
                  soTien: true,
                  phiSan: true,
                  thanhToanThuc: true,
                }
              }
            }
          }
        }
      });

      // Calculate revenue per instructor
      const instructorRevenue = instructors.map(instructor => {
        let totalGross = 0;
        let totalNet = 0;
        let totalStudents = 0;
        const courseBreakdown: any[] = [];

        instructor.khoaHocs.forEach(course => {
          const courseGross = course.dangKyHocs.reduce((sum, e) => sum + e.soTien, 0);
          const courseNet = course.dangKyHocs.reduce((sum, e) => sum + e.thanhToanThuc, 0);
          const students = course.dangKyHocs.length;

          totalGross += courseGross;
          totalNet += courseNet;
          totalStudents += students;

          if (students > 0) {
            courseBreakdown.push({
              tenKhoaHoc: course.tenKhoaHoc,
              soHocVien: students,
              doanhThu: courseGross.toLocaleString() + "đ",
              thucNhan: courseNet.toLocaleString() + "đ",
            });
          }
        });

        return {
          tenGiangVien: instructor.name,
          email: instructor.email,
          soKhoaHoc: instructor.khoaHocs.length,
          tongHocVien: totalStudents,
          tongDoanhThu: totalGross,
          tongDoanhThuFormatted: totalGross.toLocaleString() + "đ",
          thucNhan: totalNet.toLocaleString() + "đ (95%)",
          khoaHoc: courseBreakdown,
        };
      });

      // Sort by total revenue descending
      instructorRevenue.sort((a, b) => b.tongDoanhThu - a.tongDoanhThu);

      // Calculate totals
      const totalSystemRevenue = instructorRevenue.reduce((sum, i) => sum + i.tongDoanhThu, 0);

      return {
        found: true,
        tongDoanhThuHeThong: totalSystemRevenue.toLocaleString() + "đ",
        soGiangVien: instructorRevenue.length,
        topGiangVien: instructorRevenue.slice(0, limit).map((i, index) => ({
          hang: index + 1,
          ten: i.tenGiangVien,
          soKhoaHoc: i.soKhoaHoc,
          tongHocVien: i.tongHocVien,
          doanhThu: i.tongDoanhThuFormatted,
          thucNhan: i.thucNhan,
          chiTietKhoaHoc: i.khoaHoc,
        })),
        tip: "Doanh thu thực nhận = 95% tổng doanh thu (sau khi trừ phí sàn 5%)."
      };
    } catch (error) {
      console.error("Get revenue by instructor error:", error);
      return { error: "Không thể lấy doanh thu theo giảng viên." };
    }
  },
});
