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

  const [
    totalUsers,
    totalTeachers,
    totalCourses,
    premiumActiveCount,
    premiumExpiringCount,
    currentPeriodStats,
    previousPeriodStats,
    monthlyUserGrowth
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    
    // Total teachers
    prisma.user.count({ where: { role: "teacher" } }),
    
    // Total courses
    prisma.khoaHoc.count(),
    
    // Active premium (isPremium=true AND premiumExpires > now)
    prisma.user.count({ 
      where: { 
        isPremium: true,
        premiumExpires: { gt: now }
      } 
    }),
    
    // Expiring in 7 days
    prisma.user.count({
      where: {
        isPremium: true,
        premiumExpires: {
          gt: now,
          lt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    
    // Current period revenue
    prisma.thanhToanPremium.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayTao: { gte: startDate }
      },
      _sum: { soTien: true },
      _count: true
    }),
    
    // Previous period revenue
    prisma.thanhToanPremium.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayTao: { gte: previousStart, lt: startDate }
      },
      _sum: { soTien: true },
      _count: true
    }),
    
    // Monthly user growth for chart
    getMonthlyUserGrowth()
  ]);
  
  // Calculate growth percentages
  const currentRevenue = currentPeriodStats._sum.soTien || 0;
  const previousRevenue = previousPeriodStats._sum.soTien || 0;
  
  const revenueGrowth = previousRevenue === 0 
    ? (currentRevenue > 0 ? 100 : 0)
    : Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
  
  const premiumGrowth = previousPeriodStats._count === 0
    ? (currentPeriodStats._count > 0 ? 100 : 0)
    : Math.round(((currentPeriodStats._count - previousPeriodStats._count) / previousPeriodStats._count) * 100);
  
  // Conversion rate
  const conversionRate = totalUsers > 0 
    ? ((premiumActiveCount / totalUsers) * 100).toFixed(1) 
    : "0.0";
  
  return {
    totalUsers,
    totalTeachers,
    totalCourses,
    premiumActiveCount,
    premiumExpiringCount,
    monthlyRevenue: currentRevenue,
    conversionRate,
    revenueGrowth,
    premiumGrowth,
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
