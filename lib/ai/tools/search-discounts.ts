import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/embedding";

export const searchDiscountsTool = tool({
  description: "Tìm mã giảm giá và chương trình khuyến mãi. Dùng khi user hỏi 'có ưu đãi không', 'mã giảm giá', 'sinh viên', 'khuyến mãi'.",
  inputSchema: z.object({
    query: z.string().describe("Nhu cầu của user: 'sinh viên', 'khóa React', 'ưu đãi tháng 1'"),
    courseId: z.string().optional().describe("ID khóa học cụ thể (nếu có)"),
  }),
  execute: async ({ query, courseId }) => {
    try {
      const now = new Date();
      
      // Kiểm tra xem có embedding hay chưa (dùng raw SQL vì Unsupported type)
      const embeddingCheck: { count: bigint }[] = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "maGiamGia" WHERE embedding IS NOT NULL
      `;
      const hasEmbedding = embeddingCheck[0]?.count > 0;
      
      let validDiscounts: any[] = [];
      
      if (hasEmbedding) {
        // Hybrid Search: Vector + Prisma
        const embedding = await generateEmbedding(query);
        const vectorQuery = `[${embedding.join(",")}]`;
        
        // Step 1: Vector Search
        const campaigns: any[] = await prisma.$queryRaw`
          SELECT 
            id, "tieuDe", "moTa", "maGiamGia", loai, "giaTri",
            "soLuong", "daSuDung", "ngayKetThuc", "hoatDong",
            1 - (embedding <=> ${vectorQuery}::vector) as similarity
          FROM "maGiamGia"
          WHERE embedding IS NOT NULL
          AND "hoatDong" = true
          AND 1 - (embedding <=> ${vectorQuery}::vector) > 0.3
          ORDER BY similarity DESC
          LIMIT 10
        `;
        
        // Step 2: Prisma Validation
        validDiscounts = campaigns.filter(c => 
          c.soLuong > c.daSuDung && 
          (!c.ngayKetThuc || new Date(c.ngayKetThuc) > now)
        );
      } else {
        // Fallback: Simple Prisma query
        const discounts = await prisma.maGiamGia.findMany({
          where: { 
            hoatDong: true, 
            soLuong: { gt: prisma.maGiamGia.fields.daSuDung as any }
          },
          take: 10
        });
        validDiscounts = discounts.filter(d => 
          d.soLuong > d.daSuDung &&
          (!d.ngayKetThuc || d.ngayKetThuc > now)
        );
      }
      
      // Step 3: Filter by course if specified
      if (courseId && validDiscounts.length > 0) {
        const courseDiscountIds = await prisma.maGiamGiaKhoaHoc.findMany({
          where: { khoaHocId: courseId },
          select: { maGiamGiaId: true }
        });
        const ids = courseDiscountIds.map(d => d.maGiamGiaId);
        validDiscounts = validDiscounts.filter(d => ids.includes(d.id));
      }
      // 🧠 FALLBACK: Không tìm thấy mã phù hợp query → Gợi ý mã đang hoạt động
      if (validDiscounts.length === 0) {
        console.log("🔄 Fallback: Không tìm thấy mã phù hợp, đang lấy gợi ý thay thế...");
        
        // Lấy top mã giảm giá đang hoạt động
        const fallbackDiscounts = await prisma.maGiamGia.findMany({
          where: {
            hoatDong: true,
            OR: [
              { ngayKetThuc: null },
              { ngayKetThuc: { gt: now } }
            ]
          },
          orderBy: { giaTri: "desc" }, // Ưu tiên giá trị cao nhất
          take: 3
        });
        
        const validFallbacks = fallbackDiscounts.filter(d => d.soLuong > d.daSuDung);
        
        if (validFallbacks.length > 0) {
          return {
            found: false,
            exactMatch: false,
            message: `Tôi chưa tìm thấy mã giảm giá phù hợp với yêu cầu "${query}", nhưng đây là những ưu đãi tốt nhất hiện có:`,
            suggestions: validFallbacks.map(d => ({
              campaign: d.tieuDe,
              code: d.maGiamGia,
              discount: d.loai === 'PhanTram' ? `${d.giaTri}%` : `${d.giaTri.toLocaleString()}đ`,
              remaining: d.soLuong - d.daSuDung,
              expires: d.ngayKetThuc ? new Date(d.ngayKetThuc).toLocaleDateString('vi-VN') : 'Không giới hạn'
            })),
            tip: "Hãy thử áp dụng một trong những mã trên!"
          };
        }
        
        return {
          found: false,
          message: "Hiện chưa có mã giảm giá nào đang hoạt động. Hãy theo dõi để nhận thông báo ưu đãi mới!"
        };
      }

      // Format for AI display
      return {
        found: true,
        discounts: validDiscounts.map(d => ({
          campaign: d.tieuDe,
          description: d.moTa || "Ưu đãi đặc biệt",
          code: d.maGiamGia,
          discount: d.loai === 'PhanTram' ? `${d.giaTri}%` : `${d.giaTri.toLocaleString()}đ`,
          remaining: d.soLuong - d.daSuDung,
          status: (d.soLuong - d.daSuDung) < 5 ? '🔥 Sắp hết' : '✅ Còn lượt',
          expires: d.ngayKetThuc ? new Date(d.ngayKetThuc).toLocaleDateString('vi-VN') : 'Không giới hạn'
        })),
        tip: "Sử dụng mã ngay để không bỏ lỡ ưu đãi!"
      };
    } catch (error) {
      console.error("Discount search error:", error);
      return { found: false, error: "Không thể tìm kiếm mã giảm giá. Vui lòng thử lại." };
    }
  },
});
