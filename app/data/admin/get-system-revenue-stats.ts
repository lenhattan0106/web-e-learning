import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";
import { startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";

export interface SystemRevenueData {
  label: string;
  date: string; 
  premiumRevenue: number;
  platformFee: number;
  total: number;
}

export interface SystemRevenueStats {
  data: SystemRevenueData[];
  totalPremium: number;
  totalPlatformFee: number;
  totalRevenue: number;
  growth: number;
  granularity: "day" | "week" | "month"; 
}

export async function getSystemRevenueStats(duration: number = 30): Promise<SystemRevenueStats> {
  await requireAdmin();

  const now = new Date();
  const startDate = subDays(now, duration);
  
  const previousStart = subDays(startDate, duration);

  // ✅ Automatic Granularity Selection
  // <= 30 days: Day
  // 30 < days <= 90: Week
  // > 90 days: Month
  let granularity: "day" | "week" | "month" = "day";
  if (duration > 90) granularity = "month";
  else if (duration > 30) granularity = "week";

  // Get Premium payments
  const premiumPayments = await prisma.thanhToanPremium.findMany({
    where: {
      trangThai: "DaThanhToan",
      ngayTao: { gte: startDate },
    },
    select: {
      soTien: true,
      ngayTao: true,
    },
  });

  // Get Platform fees
  const enrollments = await prisma.dangKyHoc.findMany({
    where: {
      trangThai: "DaThanhToan",
      ngayTao: { gte: startDate },
      phiSan: { gt: 0 },
    },
    select: {
      phiSan: true,
      ngayTao: true,
    },
  });

  // Get previous period data for growth calculation
  const [prevPremiumSum, prevPlatformFeeSum] = await Promise.all([
    prisma.thanhToanPremium.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayTao: { gte: previousStart, lt: startDate },
      },
      _sum: { soTien: true },
    }),
    prisma.dangKyHoc.aggregate({
      where: {
        trangThai: "DaThanhToan",
        ngayTao: { gte: previousStart, lt: startDate },
      },
      _sum: { phiSan: true },
    }),
  ]);

  const dataMap: Record<string, SystemRevenueData> = {};

  // Initialize Data Points
  if (granularity === "day") {
    const days = eachDayOfInterval({ start: startDate, end: now });
    days.forEach(day => {
       const key = format(day, "yyyy-MM-dd");
       dataMap[key] = {
         label: format(day, "dd/MM"),
         date: key,
         premiumRevenue: 0,
         platformFee: 0,
         total: 0
       };
    });
  } else if (granularity === "week") {
    // For weekly, we align to weeks.
    // Note: eachWeekOfInterval might start from the absolute start of week.
    // We use weekStartsOn: 1 (Monday)
    const weeks = eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 });
    weeks.forEach(weekStart => {
       // Identify week by start date
       const key = format(weekStart, "yyyy-MM-dd"); 
       const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
       
       // Format label: "01/01 - 07/01"
       const label = `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`;

       dataMap[key] = {
         label: label,
         date: key,
         premiumRevenue: 0,
         platformFee: 0,
         total: 0
       }
    });
  } else {
    // Month
    const months = eachMonthOfInterval({ start: startDate, end: now });
    months.forEach(monthStart => {
       const key = format(monthStart, "yyyy-MM");
       dataMap[key] = {
         label: format(monthStart, "MM/yyyy"), // T1 2024
         date: key,
         premiumRevenue: 0,
         platformFee: 0,
         total: 0
       }
    });
  }

  // Populate Premium Data
  premiumPayments.forEach((p) => {
    let key;
    if (granularity === "day") {
       key = format(p.ngayTao, "yyyy-MM-dd");
    } else if (granularity === "week") {
       const weekStart = startOfWeek(p.ngayTao, { weekStartsOn: 1 });
       key = format(weekStart, "yyyy-MM-dd");
    } else {
       key = format(p.ngayTao, "yyyy-MM");
    }

    if (dataMap[key]) {
      dataMap[key].premiumRevenue += p.soTien;
    }
  });

  // Populate Platform Fee Data
  enrollments.forEach((e) => {
    if (e.phiSan) {
      let key;
      if (granularity === "day") {
         key = format(e.ngayTao, "yyyy-MM-dd");
      } else if (granularity === "week") {
         const weekStart = startOfWeek(e.ngayTao, { weekStartsOn: 1 });
         key = format(weekStart, "yyyy-MM-dd");
      } else {
         key = format(e.ngayTao, "yyyy-MM");
      }
      
      if (dataMap[key]) {
        dataMap[key].platformFee += e.phiSan;
      }
    }
  });

  // Calculate Totals and Convert to Array
  Object.values(dataMap).forEach((item) => {
    item.total = item.premiumRevenue + item.platformFee;
  });

  const data = Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));

  const totalPremium = data.reduce((acc, d) => acc + d.premiumRevenue, 0);
  const totalPlatformFee = data.reduce((acc, d) => acc + d.platformFee, 0);
  const totalRevenue = totalPremium + totalPlatformFee;

  const prevTotal = (prevPremiumSum._sum.soTien || 0) + (prevPlatformFeeSum._sum.phiSan || 0);
  const growth = prevTotal === 0
    ? (totalRevenue > 0 ? 100 : 0)
    : Math.round(((totalRevenue - prevTotal) / prevTotal) * 100);

  return {
    data,
    totalPremium,
    totalPlatformFee,
    totalRevenue,
    growth,
    granularity, 
  };
}
