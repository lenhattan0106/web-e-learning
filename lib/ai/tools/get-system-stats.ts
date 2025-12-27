
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getSystemStatsTool = tool({
  description: "Get general statistics about the system, such as total number of courses and categories. Use this when the user asks 'how many courses do you have?' or 'what topics are available?'.",
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
      return { error: "Failed to retrieve system stats." };
    }
  },
});
