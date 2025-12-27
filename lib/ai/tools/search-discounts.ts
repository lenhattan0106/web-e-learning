
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const searchDiscountsTool = tool({
  description: "Search for active discount codes (coupons). Use this when user asks for 'deals', 'discounts', or 'coupons'.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      return await prisma.maGiamGia.findMany({
        where: { hoatDong: true, soLuong: { gt: 0 } },
        select: { maGiamGia: true, tieuDe: true, giaTri: true, loai: true, soLuong: true }
      });
    } catch (error) {
      console.error("Discount search error:", error);
      return { error: "Failed to search discounts." };
    }
  },
});
