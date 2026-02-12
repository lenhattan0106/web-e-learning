/* eslint-disable @typescript-eslint/no-explicit-any */

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/embedding";

export const searchCoursesRAGTool = tool({
  description: "Tìm kiếm khóa học theo ngữ nghĩa. SỬ DỤNG KHI user hỏi: 'nên học gì', 'có khóa nào về...', 'lộ trình học', 'tư vấn khóa học', 'khóa Backend', 'khóa NodeJS'.",
  inputSchema: z.object({
    query: z.string().describe("Câu hỏi hoặc nhu cầu của user"),
    level: z.string().optional().describe("Cấp độ (tùy chọn)"),
    category: z.string().optional().describe("Danh mục (tùy chọn)"),
  }),
  execute: async ({ query, level, category }) => {
    try {
      const embedding = await generateEmbedding(query);
      const vectorQuery = `[${embedding.join(",")}]`;
      
      // Vector Search on KhoaHoc - filter by trangThai enum directly
      const courses: any[] = await prisma.$queryRaw`
        SELECT 
          kh.id, 
          kh."tenKhoaHoc", 
          kh."moTaNgan", 
          kh."duongDan", 
          kh."gia",
          kh."thoiLuong",
          dm."ten_danh_muc" as "danhMuc",
          cd."ten_cap_do" as "capDo",
          1 - (kh.embedding <=> ${vectorQuery}::vector) as similarity
        FROM "khoaHoc" kh
        LEFT JOIN "danh_muc" dm ON kh."id_danh_muc" = dm.id
        LEFT JOIN "cap_do" cd ON kh."id_cap_do" = cd.id
        WHERE kh.embedding IS NOT NULL
        AND kh."trangThai" = 'BanChinhThuc'
        AND 1 - (kh.embedding <=> ${vectorQuery}::vector) > 0.3
        ORDER BY similarity DESC
        LIMIT 10
      `;
      
      // ✅ KẾT QUẢ TÌM THẤY
      if (courses && courses.length > 0) {
        return {
          found: true,
          courses: courses.map(c => ({
            name: c.tenKhoaHoc,
            description: c.moTaNgan,
            category: c.danhMuc || "Chung",
            level: c.capDo || "Tất cả",
            price: c.gia === 0 ? "Miễn phí" : c.gia.toLocaleString() + "đ",
            duration: c.thoiLuong + " phút",
            link: `/courses/${c.duongDan}`,
            matchScore: Math.round(c.similarity * 100) + "%"
          })),
          tip: "Bạn có thể hỏi thêm về nội dung chi tiết của từng khóa học!"
        };
      }
      
      // 🧠 FALLBACK: Không tìm thấy → Gợi ý khóa học phổ biến
      console.log("🔄 Fallback: Không tìm thấy kết quả chính xác, đang lấy gợi ý thay thế...");
      
      const fallbackCourses = await prisma.khoaHoc.findMany({
        where: {
          trangThai: "BanChinhThuc"
        },
        select: {
          id: true,
          tenKhoaHoc: true,
          moTaNgan: true,
          duongDan: true,
          gia: true,
          thoiLuong: true,
          danhMucRef: { select: { tenDanhMuc: true } },
          capDoRef: { select: { tenCapDo: true } },
          _count: { select: { dangKyHocs: true } }
        },
        orderBy: [
          { dangKyHocs: { _count: "desc" } },
          { ngayTao: "desc" }
        ],
        take: 3
      });
      
      if (fallbackCourses.length > 0) {
        return {
          found: false,
          exactMatch: false,
          message: `Tôi chưa tìm thấy khóa học chính xác về "${query}", nhưng đây là những khóa học phổ biến:`,
          suggestions: fallbackCourses.map(c => ({
            name: c.tenKhoaHoc,
            description: c.moTaNgan,
            category: c.danhMucRef?.tenDanhMuc || "Chung",
            level: c.capDoRef?.tenCapDo || "Tất cả",
            price: c.gia === 0 ? "Miễn phí" : c.gia.toLocaleString() + "đ",
            students: c._count.dangKyHocs,
            link: `/courses/${c.duongDan}`
          })),
          tip: "Hãy mô tả rõ hơn nhu cầu để tôi tìm khóa học phù hợp!"
        };
      }
      
      return { 
        found: false, 
        message: "Hiện chưa có khóa học nào. Hãy theo dõi nền tảng để nhận thông báo!"
      };
      
    } catch (error) {
      console.error("Course RAG search error:", error);
      return { found: false, error: "Không thể tìm kiếm. Vui lòng thử lại." };
    }
  },
});
