/**
 * Get Admin Dashboard Tool
 * 
 * Returns system-wide statistics for Admin:
 * - Total revenue from ALL transactions (courses + premium)
 * - Total users, courses, enrollments
 * - Recent transactions
 * - Pending reports count
 * - Average rating
 */

import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const getAdminDashboardTool = tool({
  description: "Lấy thống kê TOÀN HỆ THỐNG cho Admin. Bao gồm: tổng doanh thu, số người dùng, số khóa học, hội viên AI active, cần xử lý, rating trung bình. SỬ DỤNG KHI Admin hỏi: 'doanh thu', 'thống kê hệ thống', 'tổng doanh thu', 'dashboard', 'bao nhiêu người dùng'.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // 1. Course revenue from paid enrollments
      const courseRevenue = await prisma.dangKyHoc.aggregate({
        where: { trangThai: "DaThanhToan" },
        _sum: { soTien: true, phiSan: true },
        _count: true,
      });

      // 2. Premium revenue from ThanhToanPremium (correct model name from schema)
      const premiumRevenue = await prisma.thanhToanPremium.aggregate({
        where: { trangThai: "DaThanhToan" },
        _sum: { soTien: true },
        _count: true,
      });

      // 3. Total users
      const totalUsers = await prisma.user.count();

      // 4. Total published courses
      const totalCourses = await prisma.khoaHoc.count({
        where: { trangThai: "BanChinhThuc" }
      });

      // 5. Active Premium users (Hội viên AI Active)
      const premiumUsers = await prisma.user.count({
        where: {
          isPremium: true,
          premiumExpires: { gt: new Date() }
        }
      });

      // 6. Pending reports (Cần xử lý)
      const pendingReports = await prisma.baoCaoBinhLuan.count({
        where: { trangThai: "ChoXuLy" }
      });

      // 7. Average rating
      const ratingStats = await prisma.danhGia.aggregate({
        where: { trangThai: "HIEN" },
        _avg: { diemDanhGia: true },
        _count: true,
      });

      // 8. Premium expiring soon (7 days)
      const expiringPremium = await prisma.user.count({
        where: {
          isPremium: true,
          premiumExpires: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      // 9. Recent transactions (courses + premium combined) - WITH INSTRUCTOR NAME
      const recentCourseTransactions = await prisma.dangKyHoc.findMany({
        where: { trangThai: "DaThanhToan" },
        orderBy: { ngayTao: "desc" },
        take: 5,
        include: {
          nguoiDung: { select: { name: true } },
          khoaHoc: { 
            select: { 
              tenKhoaHoc: true,
              nguoiDung: { select: { name: true } } // Instructor name
            } 
          }
        }
      });

      const recentPremiumTransactions = await prisma.thanhToanPremium.findMany({
        where: { trangThai: "DaThanhToan" },
        orderBy: { ngayTao: "desc" },
        take: 5,
        include: {
          nguoiDung: { select: { name: true } }
        }
      });

      const totalRevenue = (courseRevenue._sum.soTien || 0) + (premiumRevenue._sum.soTien || 0);
      const adminFees = courseRevenue._sum.phiSan || 0;

      return {
        overview: {
          tongNguoiDung: totalUsers,
          dongTienHeThong: totalRevenue.toLocaleString() + "đ",
          hoiVienAIActive: premiumUsers,
          canXuLy: pendingReports,
          ratingTrungBinh: ratingStats._avg.diemDanhGia?.toFixed(1) || "0",
          sapHetHanPremium: expiringPremium,
        },
        chiTietDoanhThu: {
          doanhThuKhoaHoc: (courseRevenue._sum.soTien || 0).toLocaleString() + "đ",
          doanhThuPremium: (premiumRevenue._sum.soTien || 0).toLocaleString() + "đ",
          phiSanAdmin: adminFees.toLocaleString() + "đ (5%)",
          tongGiaoDich: courseRevenue._count + premiumRevenue._count,
        },
        giaoDichGanDay: {
          khoaHoc: recentCourseTransactions.map(t => ({
            nguoiMua: t.nguoiDung?.name || "Ẩn danh",
            khoaHoc: t.khoaHoc?.tenKhoaHoc || "N/A",
            giangVien: t.khoaHoc?.nguoiDung?.name || "N/A",
            soTien: t.soTien.toLocaleString() + "đ",
            ngay: t.ngayTao.toLocaleDateString('vi-VN')
          })),
          premium: recentPremiumTransactions.map(t => ({
            nguoiMua: t.nguoiDung?.name || "Ẩn danh",
            goiPremium: t.soNgay + " ngày",
            soTien: t.soTien.toLocaleString() + "đ",
            ngay: t.ngayTao.toLocaleDateString('vi-VN')
          })),
        },
        tip: "Đây là dữ liệu realtime từ hệ thống."
      };
    } catch (error) {
      console.error("Admin dashboard error:", error);
      return { error: "Không thể lấy thống kê hệ thống." };
    }
  },
});
