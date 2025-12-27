
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

// NOTE: In a real app, userId should be passed dynamically or verified securely.
// For this 'PhD-level' demo, we accept userId as a parameter often injected by the system prompt or caller,
// OR we use a hardcoded test ID if not provided, to simulate the functionality.
// In the route.ts, we will inject the userId into the tool context if possible, 
// or simpler: we define the tool to take userId as input (which the agent fills from context).

export const getMyProgressTool = tool({
  description: "Check the current user's learning progress. Returns list of purchased courses and completion percentage. Use this when user asks 'my progress' or 'what am I learning'.",
  inputSchema: z.object({
     userId: z.string().describe("The ID of the user to check progress for. Provided by system context."),
  }),
  execute: async ({ userId }) => {
    if (!userId || userId === 'guest') return { error: "User is not logged in." };

    try {
      const progress = await prisma.dangKyHoc.findMany({
        where: { idNguoiDung: userId, trangThai: "DaThanhToan" },
        include: { 
          khoaHoc: { 
            include: { 
              chuongs: { include: { baiHocs: { include: { tienTrinhHocs: { where: { idNguoiDung: userId } } } } } } 
            } 
          } 
        }
      });

      return progress.map(p => ({
        course: p.khoaHoc.tenKhoaHoc,
        totalLessons: p.khoaHoc.chuongs.reduce((acc, c) => acc + c.baiHocs.length, 0),
        completedLessons: p.khoaHoc.chuongs.reduce((acc, c) => acc + c.baiHocs.filter(b => b.tienTrinhHocs[0]?.hoanThanh).length, 0)
      }));
    } catch (error) {
      console.error("Progress check error:", error);
      return { error: "Failed to check progress." };
    }
  },
});
