/**
 * Get My Enrolled Courses Tool
 * 
 * Lấy danh sách khóa học mà USER đã đăng ký/mua
 * Dùng khi user hỏi "khóa học của tôi", "tôi đã mua gì"
 */

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getMyCoursesTool = tool({
  description: "Lấy danh sách khóa học mà USER đã đăng ký/mua (với vai trò HỌC VIÊN). SỬ DỤNG KHI user hỏi: 'khóa học tôi đang học', 'tôi đã mua gì', 'khóa học đã đăng ký'. KHÔNG DÙNG để lấy khóa học mà giảng viên đang dạy.",
  inputSchema: z.object({
    userId: z.string().describe("ID của user hiện tại"),
  }),
  execute: async ({ userId }) => {
    try {
      const enrollments = await prisma.dangKyHoc.findMany({
        where: { 
          idNguoiDung: userId,
          trangThai: "DaThanhToan"
        },
        select: {
          id: true,
          ngayTao: true,
          khoaHoc: {
            select: {
              tenKhoaHoc: true,
              duongDan: true,
              moTaNgan: true,
              gia: true,
              nguoiDung: { select: { name: true } },
              danhMucRef: { select: { tenDanhMuc: true } },
              _count: { select: { chuongs: true } }
            }
          }
        },
        orderBy: { ngayTao: "desc" }
      });

      if (enrollments.length === 0) {
        return { 
          found: false, 
          message: "Bạn chưa mua khóa học nào. Hãy khám phá các khóa học trên hệ thống nhé!"
        };
      }

      return {
        found: true,
        totalCourses: enrollments.length,
        courses: enrollments.map(e => ({
          name: e.khoaHoc.tenKhoaHoc,
          description: e.khoaHoc.moTaNgan,
          instructor: e.khoaHoc.nguoiDung?.name || "Ẩn danh",
          category: e.khoaHoc.danhMucRef?.tenDanhMuc || "Chung",
          chapters: e.khoaHoc._count.chuongs,
          enrolledAt: e.ngayTao.toLocaleDateString("vi-VN"),
          link: `/dashboard/${e.khoaHoc.duongDan}`
        })),
        tip: "Tiếp tục học để hoàn thành các khóa học đã mua nhé!"
      };
    } catch (error) {
      console.error("Get my courses error:", error);
      return { found: false, error: "Không thể lấy danh sách khóa học của bạn." };
    }
  },
});
