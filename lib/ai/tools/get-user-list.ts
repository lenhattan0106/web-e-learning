/**
 * Get User List Tool (for Admin)
 * 
 * Returns list of users with filtering options
 */

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getUserListTool = tool({
  description: "Lấy danh sách người dùng hệ thống. SỬ DỤNG KHI Admin hỏi: 'danh sách người dùng', 'users', 'ai đã đăng ký', 'người dùng premium', 'giảng viên nào'.",
  inputSchema: z.object({
    filter: z.enum(["all", "premium", "teacher", "banned"]).optional().describe("Lọc theo loại: all, premium, teacher, banned"),
    limit: z.number().optional().describe("Số lượng tối đa, mặc định 10"),
  }),
  execute: async ({ filter = "all", limit = 10 }) => {
    try {
      const where: any = {};

      switch (filter) {
        case "premium":
          where.isPremium = true;
          where.premiumExpires = { gt: new Date() };
          break;
        case "teacher":
          where.role = "teacher";
          break;
        case "banned":
          where.banned = true;
          break;
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isPremium: true,
          premiumExpires: true,
          banned: true,
          createdAt: true,
          _count: {
            select: {
              khoaHocs: true,
              dangKyHocs: true,
            }
          }
        }
      });

      const totalCount = await prisma.user.count({ where });

      return {
        found: true,
        filter: filter,
        total: totalCount,
        users: users.map(u => ({
          id: u.id,
          ten: u.name,
          email: u.email,
          vaiTro: u.role === "teacher" ? "Giảng viên" : u.role === "admin" ? "Admin" : "Học viên",
          isPremium: u.isPremium ? "✅" : "❌",
          premiumHetHan: u.premiumExpires?.toLocaleDateString('vi-VN') || "-",
          trangThai: u.banned ? "🚫 Bị cấm" : "✅ Hoạt động",
          soKhoaHocTao: u._count.khoaHocs,
          soKhoaHocMua: u._count.dangKyHocs,
          ngayDangKy: u.createdAt.toLocaleDateString('vi-VN'),
        })),
        tip: filter === "all" 
          ? "Bạn có thể lọc theo: premium, teacher, banned" 
          : "Bạn có thể hỏi về người dùng cụ thể."
      };
    } catch (error) {
      console.error("Get user list error:", error);
      return { error: "Không thể lấy danh sách người dùng." };
    }
  },
});
