
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/embedding";

export const searchCoursesTool = tool({
  description: "Tìm kiếm bài học và khóa học trong hệ thống. SỬ DỤNG KHI user hỏi: 'tìm khóa học', 'có khóa nào về...', 'bài học về...', 'nội dung gì...'. Tool này tìm kiếm theo ngữ nghĩa (semantic).",
  inputSchema: z.object({
    query: z.string().describe("Từ khóa hoặc câu hỏi của user, ví dụ: 'React', 'NodeJS backend', 'CSS animation'"),
  }),
  execute: async ({ query }) => {
    try {
      const embedding = await generateEmbedding(query);
      const vectorQuery = `[${embedding.join(",")}]`;

      // Prisma raw query for pgvector
      const lessons: any[] = await prisma.$queryRaw`
        SELECT 
          bh."tenBaiHoc", 
          bh."moTa", 
          kh."duongDan" as "slugKhoaHoc", 
          kh."tenKhoaHoc",
          1 - (bh."embedding" <=> ${vectorQuery}::vector) as similarity
        FROM "baiHoc" bh
        JOIN "chuong" c ON bh."idChuong" = c."id"
        JOIN "khoaHoc" kh ON c."idKhoaHoc" = kh."id"
        WHERE kh."trangThai" = 'BanChinhThuc'
        AND bh."embedding" IS NOT NULL
        AND 1 - (bh."embedding" <=> ${vectorQuery}::vector) > 0.35
        ORDER BY similarity DESC
        LIMIT 5;
      `;
      
      if (!lessons || lessons.length === 0) {
          return { found: false, message: "Không tìm thấy bài học phù hợp." };
      }

      return {
        found: true,
        results: lessons.map(l => ({
          title: l.tenBaiHoc,
          course: l.tenKhoaHoc,
          description: l.moTa,
          link: `/courses/${l.slugKhoaHoc}`,
          matchScore: Math.round(l.similarity * 100) + "%"
        }))
      };
    } catch (error) {
      console.error("Vector search error:", error);
      return { found: false, error: "Lỗi khi tìm kiếm." };
    }
  },
});
