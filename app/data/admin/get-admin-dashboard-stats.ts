import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function getAdminDashboardStats(duration: number = 30) {
  await requireAdmin();
  
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - duration);
  
  const previousStart = new Date();
  previousStart.setDate(startDate.getDate() - duration);

  // 1. Total Users & Conversion Rate
  const totalUsers = await prisma.user.count();
  
  // Users who bought at least 1 course
  const usersWithPurchase = await prisma.user.count({
    where: {
      dangKyHocs: {
        some: {
          trangThai: "DaThanhToan"
        }
      }
    }
  });

  const conversionRate = totalUsers > 0 
    ? ((usersWithPurchase / totalUsers) * 100).toFixed(1) 
    : "0.0";

  // 2. Revenue (Premium + Platform Fee)
  // Current Period
  const currentPremiumRevenue = await prisma.thanhToanPremium.aggregate({
    where: {
      trangThai: "DaThanhToan",
      ngayTao: { gte: startDate }
    },
    _sum: { soTien: true }
  });

  const currentPlatformFee = await prisma.dangKyHoc.aggregate({
    where: {
      trangThai: "DaThanhToan",
      ngayTao: { gte: startDate }
    },
    _sum: { phiSan: true }
  });

  const currentRevenue = (currentPremiumRevenue._sum.soTien || 0) + (currentPlatformFee._sum.phiSan || 0);

  // Previous Period
  const prevPremiumRevenue = await prisma.thanhToanPremium.aggregate({
    where: {
      trangThai: "DaThanhToan",
      ngayTao: { gte: previousStart, lt: startDate }
    },
    _sum: { soTien: true }
  });

  const prevPlatformFee = await prisma.dangKyHoc.aggregate({
    where: {
      trangThai: "DaThanhToan",
      ngayTao: { gte: previousStart, lt: startDate }
    },
    _sum: { phiSan: true }
  });

  const previousRevenue = (prevPremiumRevenue._sum.soTien || 0) + (prevPlatformFee._sum.phiSan || 0);
  
  const revenueGrowth = previousRevenue === 0 
    ? (currentRevenue > 0 ? 100 : 0)
    : Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);

  // 3. Premium Stats
  const premiumActiveCount = await prisma.user.count({ 
    where: { 
      isPremium: true,
      premiumExpires: { gt: now }
    } 
  });

  const premiumExpiringCount = await prisma.user.count({
    where: {
      isPremium: true,
      premiumExpires: {
        gt: now,
        lt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }
  });

  // 4. Quality Metrics (Reports & Ratings)
  const pendingReports = await prisma.baoCaoBinhLuan.count({
    where: { trangThai: "ChoXuLy" }
  });

  const avgRatingAgg = await prisma.danhGia.aggregate({
    where: { trangThai: "HIEN" },
    _avg: { diemDanhGia: true }
  });
  
  const avgRating = avgRatingAgg._avg.diemDanhGia ? avgRatingAgg._avg.diemDanhGia.toFixed(1) : "0.0";

  // Aux stats
  const totalTeachers = await prisma.user.count({ where: { role: "teacher" } });
  const totalCourses = await prisma.khoaHoc.count();
  
  // Monthly growth for chart (reuse existing logic if needed or simplify)
  const monthlyUserGrowth = await getMonthlyUserGrowth();

  return {
    totalUsers,
    totalTeachers,
    totalCourses,
    premiumActiveCount,
    premiumExpiringCount,
    totalRevenue: currentRevenue,
    conversionRate,
    revenueGrowth,
    pendingReports,
    avgRating,
    monthlyUserGrowth
  };
}

async function getMonthlyUserGrowth() {
  const now = new Date();
  const monthsAgo = 6;
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  
  // Get users grouped by month
  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      isPremium: true
    }
  });
  
  // Group by month
  const monthlyData: Record<string, { total: number; premium: number }> = {};
  
  for (let i = 0; i <= monthsAgo; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = { total: 0, premium: 0 };
  }
  
  users.forEach(user => {
    const key = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[key]) {
      monthlyData[key].total++;
      if (user.isPremium) {
        monthlyData[key].premium++;
      }
    }
  });
  
  // Convert to array and sort
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      label: formatMonthLabel(month),
      total: data.total,
      premium: data.premium
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}
