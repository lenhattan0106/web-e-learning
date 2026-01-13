
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getSystemStatsTool = tool({
  description: "Lấy thống kê chung về hệ thống: tổng số khóa học, danh mục. SỬ DỤNG KHI user hỏi: 'có bao nhiêu khóa học', 'có những chủ đề gì'.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const count = await prisma.khoaHoc.count({ where: { trangThai: "BanChinhThuc" } });
      const categories = await prisma.khoaHoc.groupBy({ by: ['danhMuc'], _count: true });
      
      return { 
        totalCourses: count, 
        categories: categories.map(c => ({ name: c.danhMuc, count: c._count })) 
      };
    } catch (error) {
      console.error("System stats error:", error);
      return { error: "Không thể lấy thống kê hệ thống." };
    }
  },
});
