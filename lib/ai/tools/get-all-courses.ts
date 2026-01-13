/**
 * Get All Published Courses Tool
 * 
 * Liệt kê tất cả khóa học đang bán trên hệ thống
 * Hỗ trợ hiển thị danh mục lồng nhau (nested categories)
 */

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getAllCoursesTool = tool({
  description: "Lấy danh sách TẤT CẢ khóa học đang bán trên hệ thống. SỬ DỤNG KHI user hỏi: 'có những khóa học nào', 'danh sách khóa học', 'khóa học đang bán', 'khóa học trên hệ thống', 'cho xem khóa học'.",
  inputSchema: z.object({
    category: z.string().optional().describe("Tên danh mục để lọc, ví dụ: 'Lập Trình', 'Backend'"),
    limit: z.number().optional().describe("Số lượng khóa học tối đa, mặc định 10"),
  }),
  execute: async ({ category, limit = 10 }) => {
    try {
      // Build where clause
      const whereClause: any = {
        trangThai: "BanChinhThuc"
      };

      // Filter by category (bao gồm cả danh mục cha)
      if (category) {
        whereClause.AND = [
          {
            OR: [
              { danhMucRef: { tenDanhMuc: { contains: category, mode: "insensitive" } } },
              { danhMucRef: { danhMucCha: { tenDanhMuc: { contains: category, mode: "insensitive" } } } }
            ]
          }
        ];
      }

      const courses = await prisma.khoaHoc.findMany({
        where: whereClause,
        select: {
          tenKhoaHoc: true,
          moTaNgan: true,
          duongDan: true,
          gia: true,
          thoiLuong: true,
          danhMucRef: { 
            select: { 
              tenDanhMuc: true,
              danhMucCha: { select: { tenDanhMuc: true } }
            } 
          },
          capDoRef: { select: { tenCapDo: true } },
          nguoiDung: { select: { name: true } },
          _count: { select: { dangKyHocs: true } }
        },
        orderBy: [
          { dangKyHocs: { _count: "desc" } },
          { ngayTao: "desc" }
        ],
        take: limit
      });

      if (courses.length === 0) {
        return { 
          found: false, 
          message: "Hiện chưa có khóa học nào" + (category ? ` trong danh mục "${category}"` : "") + "."
        };
      }

      // Build category path cho mỗi khóa học
      const coursesWithPath = courses.map(c => {
        const parentName = c.danhMucRef?.danhMucCha?.tenDanhMuc;
        const currentName = c.danhMucRef?.tenDanhMuc;
        const categoryPath = parentName && currentName 
          ? `${parentName} > ${currentName}`
          : currentName || "Chung";

        return {
          name: c.tenKhoaHoc,
          description: c.moTaNgan,
          price: c.gia === 0 ? "Miễn phí" : c.gia.toLocaleString() + "đ",
          duration: c.thoiLuong + " phút",
          category: categoryPath,
          level: c.capDoRef?.tenCapDo || "Tất cả",
          instructor: c.nguoiDung?.name || "Ẩn danh",
          students: c._count.dangKyHocs,
          link: `/courses/${c.duongDan}`
        };
      });

      return {
        found: true,
        totalCourses: courses.length,
        courses: coursesWithPath,
        tip: "Bạn có thể hỏi chi tiết về từng khóa học hoặc tìm theo chủ đề cụ thể!"
      };
    } catch (error) {
      console.error("Get all courses error:", error);
      return { found: false, error: "Không thể lấy danh sách khóa học." };
    }
  },
});
