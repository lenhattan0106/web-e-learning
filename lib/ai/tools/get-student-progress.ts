
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getStudentProgressTool = tool({
  description: "Get the current student's learning progress. Lists completed lessons and next lessons to learn. Use this when a student asks 'my progress', 'what have I learned', or 'where did I stop'.",
  inputSchema: z.object({
    userId: z.string().describe("The ID of the student."),
  }),
  execute: async ({ userId }) => {
    try {
      if (!userId || userId === 'guest') return { error: "Please log in to view progress." };

      // Get progress
      const progress = await prisma.tienTrinhHoc.findMany({
        where: { idNguoiDung: userId },
        include: {
          baiHoc: {
            select: {
              tenBaiHoc: true,
              chuong: { select: { tenChuong: true, khoaHoc: { select: { tenKhoaHoc: true } } } }
            }
          }
        },
        orderBy: { ngayCapNhat: 'desc' }
      });

      // Filter completed vs in-progress
      const completed = progress.filter(p => p.hoanThanh).map(p => ({
        lesson: p.baiHoc.tenBaiHoc,
        course: p.baiHoc.chuong.khoaHoc.tenKhoaHoc,
        completedAt: p.ngayCapNhat.toISOString().split('T')[0]
      }));

      // In real app, we might check 'next lesson' logic, but here we return the log
      return {
        totalCompleted: completed.length,
        completedLessons: completed,
        // Potentially list in-progress
        recentActivity: progress.slice(0, 3).map(p => ({
            lesson: p.baiHoc.tenBaiHoc,
            status: p.hoanThanh ? "Completed" : "In Progress",
            lastAccess: p.ngayCapNhat
        }))
      };

    } catch (error) {
      console.error("Get student progress error:", error);
      return { error: "Failed to get progress." };
    }
  },
});
