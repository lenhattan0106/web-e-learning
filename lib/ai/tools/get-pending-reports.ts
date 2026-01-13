/**
 * Get Pending Reports Tool (for Admin)
 * 
 * Returns all pending comment reports for Admin to review
 */

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getPendingReportsTool = tool({
  description: "Lấy danh sách báo cáo bình luận CHỜ XỬ LÝ. SỬ DỤNG KHI Admin hỏi: 'báo cáo', 'cần xử lý', 'pending reports', 'bình luận bị báo cáo'.",
  inputSchema: z.object({
    limit: z.number().optional().describe("Số lượng tối đa, mặc định 10"),
  }),
  execute: async ({ limit = 10 }) => {
    try {
      const pendingReports = await prisma.baoCaoBinhLuan.findMany({
        where: { trangThai: "ChoXuLy" },
        orderBy: { ngayTao: "desc" },
        take: limit,
        include: {
          nguoiDung: { select: { name: true, email: true } },
          binhLuan: {
            select: {
              noiDung: true,
              nguoiDung: { select: { name: true } },
              baiHoc: { select: { tenBaiHoc: true } },
            }
          }
        }
      });

      if (pendingReports.length === 0) {
        return {
          found: false,
          message: "Không có báo cáo nào đang chờ xử lý. Hệ thống đang hoạt động tốt! 🎉"
        };
      }

      return {
        found: true,
        totalPending: pendingReports.length,
        reports: pendingReports.map(r => ({
          id: r.id,
          nguoiBaoCao: r.nguoiDung?.name || "Ẩn danh",
          lyDo: r.lyDo,
          ngayBaoCao: r.ngayTao.toLocaleDateString('vi-VN'),
          binhLuanBiBaoCao: {
            noiDung: r.binhLuan?.noiDung?.substring(0, 100) + "...",
            tacGia: r.binhLuan?.nguoiDung?.name || "Ẩn danh",
            baiHoc: r.binhLuan?.baiHoc?.tenBaiHoc || "N/A",
          }
        })),
        tip: "Bạn có thể xử lý báo cáo trong trang Quản lý báo cáo."
      };
    } catch (error) {
      console.error("Get pending reports error:", error);
      return { error: "Không thể lấy danh sách báo cáo." };
    }
  },
});
