import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

import { startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, subDays } from "date-fns";

export async function getAdminDashboardStats(duration: number = 30) {
  await requireAdmin();
  
  const now = new Date();
  const startDate = subDays(now, duration);
  const previousStart = subDays(startDate, duration);

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
  
  // Monthly growth for chart using dynamic duration
  const monthlyUserGrowth = await getUserGrowth(duration);

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

// Renamed and upgraded function
async function getUserGrowth(duration: number) {
  const now = new Date();
  const startDate = subDays(now, duration);
  
  // Determine granularity
  let granularity: "day" | "week" | "month" = "day";
  if (duration > 90) granularity = "month";
  else if (duration > 30) granularity = "week";
  
  // Get users grouped by date
  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      isPremium: true
    }
  });
  
  // Initialize Data Structure
  const dataMap: Record<string, { label: string; total: number; premium: number }> = {};
  
  if (granularity === "day") {
      const days = eachDayOfInterval({ start: startDate, end: now });
      days.forEach(day => {
          const key = format(day, "yyyy-MM-dd");
          dataMap[key] = {
             label: format(day, "dd/MM"),
             total: 0,
             premium: 0
          };
      })
  } else if (granularity === "week") {
      const weeks = eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 });
      weeks.forEach(weekStart => {
          const key = format(weekStart, "yyyy-MM-dd");
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          dataMap[key] = {
             label: `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`,
             total: 0,
             premium: 0
          };
      })
  } else {
      const months = eachMonthOfInterval({ start: startDate, end: now });
      months.forEach(monthStart => {
          const key = format(monthStart, "yyyy-MM");
          dataMap[key] = {
             label: format(monthStart, "MM/yyyy"),
             total: 0,
             premium: 0
          };
      })
  }
  
  // Fill Data
  users.forEach(user => {
    let key;
    if (granularity === "day") {
       key = format(user.createdAt, "yyyy-MM-dd");
    } else if (granularity === "week") {
       const weekStart = startOfWeek(user.createdAt, { weekStartsOn: 1 });
       key = format(weekStart, "yyyy-MM-dd");
    } else {
       key = format(user.createdAt, "yyyy-MM");
    }

    if (dataMap[key]) {
      dataMap[key].total++;
      if (user.isPremium) {
        dataMap[key].premium++;
      }
    }
  });
  
  // Convert to array
  return Object.entries(dataMap)
    .map(([dateKey, data]) => ({
      month: dateKey, // Keep 'month' key name for frontend compatibility, but it could be day/week
      label: data.label,
      total: data.total,
      premium: data.premium
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
