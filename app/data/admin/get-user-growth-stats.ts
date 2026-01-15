import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

interface UserGrowthDetail {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  isPremium: boolean;
}

interface UserGrowthData {
  label: string;
  month: string;
  newUsers: number;
  newPremium: number;
  details: UserGrowthDetail[];
}

/**
 * Get user growth statistics for charts
 * @param fromDate - Start date for data range
 * @param toDate - End date for data range
 * 
 * Granularity logic (matching Teacher Dashboard):
 * - ≤30 days: Daily (01/01, 02/01...)
 * - 31-90 days: Weekly (01-07/01, 08-14/01...)
 * - >90 days: Monthly (Th1 2026, Th2 2026...)
 */
export async function getUserGrowthStats(fromDate: Date, toDate: Date): Promise<UserGrowthData[]> {
  await requireAdmin();
  
  const startDate = fromDate;
  const endDate = toDate;
  
  // Calculate date range to determine granularity
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Granularity: day (≤30), week (31-90), month (>90)
  let granularity: "day" | "week" | "month";
  if (diffDays <= 30) {
    granularity = "day";
  } else if (diffDays <= 90) {
    granularity = "week";
  } else {
    granularity = "month";
  }

  // Get all users created in the period
  const users = await prisma.user.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      isPremium: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Initialize data structure based on granularity
  const dataMap: Record<string, UserGrowthData> = {};
  
  if (granularity === "day") {
    // Daily granularity - show each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
      const label = `${String(currentDate.getDate()).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
      
      dataMap[key] = {
        label,
        month: key,
        newUsers: 0,
        newPremium: 0,
        details: [],
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else if (granularity === "week") {
    // Weekly granularity - group by 7-day periods
    const currentDate = new Date(startDate);
    let weekNumber = 1;
    
    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Clamp weekEnd to not exceed endDate
      if (weekEnd > endDate) {
        weekEnd.setTime(endDate.getTime());
      }
      
      const key = `week-${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
      const label = `${String(weekStart.getDate()).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}/${String(weekStart.getMonth() + 1).padStart(2, "0")}`;
      
      dataMap[key] = {
        label,
        month: key,
        newUsers: 0,
        newPremium: 0,
        details: [],
      };
      
      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;
    }
  } else {
    // Monthly granularity
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
      if (!dataMap[key]) {
        const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
        const [year, month] = key.split("-");
        const label = `${monthNames[parseInt(month) - 1]} ${year}`;
        
        dataMap[key] = {
          label,
          month: key,
          newUsers: 0,
          newPremium: 0,
          details: [],
        };
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  // Populate data - assign each user to the correct bucket
  users.forEach((user) => {
    let key: string;
    
    if (granularity === "day") {
      key = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, "0")}-${String(user.createdAt.getDate()).padStart(2, "0")}`;
    } else if (granularity === "week") {
      // Find which week this user belongs to
      const userDate = new Date(user.createdAt);
      const daysSinceStart = Math.floor((userDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysSinceStart / 7);
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(weekStartDate.getDate() + (weekIndex * 7));
      key = `week-${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(weekStartDate.getDate()).padStart(2, "0")}`;
    } else {
      key = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, "0")}`;
    }
    
    if (dataMap[key]) {
      dataMap[key].newUsers++;
      if (user.isPremium) {
        dataMap[key].newPremium++;
      }
      dataMap[key].details.push({
        userId: user.id,
        name: user.name || "Chưa đặt tên",
        email: user.email,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
        isPremium: user.isPremium,
      });
    }
  });

  // Convert to array and sort chronologically
  return Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get user distribution (Free vs Premium) for pie chart
 */
export async function getUserDistribution(): Promise<{
  freeUsers: number;
  premiumUsers: number;
  total: number;
}> {
  await requireAdmin();

  const now = new Date();

  const [total, premiumActive] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        isPremium: true,
        premiumExpires: { gt: now },
      },
    }),
  ]);

  return {
    freeUsers: total - premiumActive,
    premiumUsers: premiumActive,
    total,
  };
}
