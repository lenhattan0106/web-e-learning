
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getMyProgressTool = tool({
  description: "Kiểm tra tiến độ học tập của người dùng. Trả về danh sách khóa học đã mua và phần trăm hoàn thành. SỬ DỤNG KHI user hỏi: 'tiến độ của tôi', 'đã học được bao nhiêu', 'hoàn thành bao nhiêu phần trăm'.",
  inputSchema: z.object({
     userId: z.string().describe("ID người dùng (lấy từ system context)"),
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
