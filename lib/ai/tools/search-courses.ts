
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/embedding";

export const searchCoursesTool = tool({
  description: "Search for lessons and courses in the database based on semantic meaning (RAG). Use this when the user asks about specific course content, definitions, or how-to questions.",
  inputSchema: z.object({
    query: z.string().describe("The user's question or keywords to search for."),
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
        JOIN "khoaHoc" c_kh ON c."idKhoaHoc" = c_kh."id"
        JOIN "khoaHoc" kh ON c."idKhoaHoc" = kh."id"
        WHERE kh."trangThai" = 'BanChinhThuc'
        AND 1 - (bh."embedding" <=> ${vectorQuery}::vector) > 0.4
        ORDER BY similarity DESC
        LIMIT 3;
      `;
      
      if (!lessons || lessons.length === 0) {
          return { found: false, message: "No relevant lessons found in database." };
      }

      return {
        found: true,
        results: lessons.map(l => ({
          title: l.tenBaiHoc,
          course: l.tenKhoaHoc,
          description: l.moTa,
          link: `/courses/${l.slugKhoaHoc}`
        }))
      };
    } catch (error) {
      console.error("Vector search error:", error);
      return { found: false, error: "Failed to search database." };
    }
  },
});
