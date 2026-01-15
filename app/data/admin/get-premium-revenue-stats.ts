import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

interface PremiumRevenueData {
  label: string;
  value: number;
  prevValue?: number;
  fullDate?: string;
  prevDateLabel?: string;
}

interface PremiumRevenueStats {
  data: PremiumRevenueData[];
  avgValue: number;
  total: number;
  granularity: "day" | "week" | "month";
}

/**
 * Get Premium revenue statistics
 * @param fromDate - Start date for data range
 * @param toDate - End date for data range
 */
export async function getPremiumRevenueStats(fromDate: Date, toDate: Date): Promise<PremiumRevenueStats> {
  await requireAdmin();

  const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Granularity logic:
  // <= 30 days: Daily
  // 31-90 days: Weekly
  // > 90 days: Monthly
  let granularity: "day" | "week" | "month";
  if (diffDays <= 30) {
    granularity = "day";
  } else if (diffDays <= 90) {
    granularity = "week";
  } else {
    granularity = "month";
  }

  // Get all premium payments in the period
  const payments = await prisma.thanhToanPremium.findMany({
    where: {
      trangThai: "DaThanhToan",
      ngayTao: { gte: fromDate, lte: toDate },
    },
    select: {
      soTien: true,
      ngayTao: true,
    },
    orderBy: { ngayTao: "asc" },
  });

  // Group data by granularity
  const dataMap: Record<string, number> = {};
  const labelMap: Record<string, string> = {}; // Store formatted labels

  // Initialize all keys in range
  const currentDate = new Date(fromDate);
  
  // Helper for monthly iteration
  if (granularity === "month") {
     // Align to start of month if needed, but for charts usually we just follow the dates
     // But strictly speaking we should iterate month by month
     // Let's keep simple iteration and compute keys
  }

  // Iterate based on granularity to initialize map
  const iterDate = new Date(fromDate);
  while (iterDate <= toDate) {
    let key = "";
    let label = "";

    if (granularity === "day") {
      key = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, "0")}-${String(iterDate.getDate()).padStart(2, "0")}`;
      label = `${String(iterDate.getDate()).padStart(2, "0")}/${String(iterDate.getMonth() + 1).padStart(2, "0")}`;
      iterDate.setDate(iterDate.getDate() + 1);
    } else if (granularity === "week") {
      const weekStart = new Date(iterDate);
      const weekEnd = new Date(iterDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > toDate) weekEnd.setTime(toDate.getTime());
      
      key = `week-${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
      label = `${String(weekStart.getDate()).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}/${String(weekStart.getMonth() + 1).padStart(2, "0")}`;
      
      iterDate.setDate(iterDate.getDate() + 7);
    } else {
      // Month
      key = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
      label = `${monthNames[iterDate.getMonth()]} ${iterDate.getFullYear()}`;
      
      // Move to next month
      iterDate.setMonth(iterDate.getMonth() + 1);
      iterDate.setDate(1); // align to 1st
    }
    
    if (key) {
      dataMap[key] = 0;
      labelMap[key] = label;
    }
  }

  // Populate data
  payments.forEach((p) => {
    let key = "";
    if (granularity === "day") {
      key = `${p.ngayTao.getFullYear()}-${String(p.ngayTao.getMonth() + 1).padStart(2, "0")}-${String(p.ngayTao.getDate()).padStart(2, "0")}`;
    } else if (granularity === "week") {
      // Find week bucket
      // Easier to recreate the week logic or find which bucket it falls into
      // Let's calculate days from start
      const daysFromStart = Math.floor((p.ngayTao.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysFromStart / 7);
      const weekStart = new Date(fromDate);
      weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
      key = `week-${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    } else {
      key = `${p.ngayTao.getFullYear()}-${String(p.ngayTao.getMonth() + 1).padStart(2, "0")}`;
    }

    if (dataMap[key] !== undefined) {
      dataMap[key] += p.soTien;
    }
  });

  // Convert to array
  // Use keys from dataMap which are already sorted if we iterate or sort them now.
  // Actually keys might not be sorted if we used random access? 
  // For week keys "week-YYYY-MM-DD" it sorts alphabetically correctly.
  
  const data: PremiumRevenueData[] = Object.entries(dataMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({
      label: labelMap[key] || key,
      value,
      fullDate: key,
    }));

  const total = data.reduce((acc, d) => acc + d.value, 0);
  const avgValue = data.length > 0 ? Math.round(total / data.length) : 0;

  return {
    data,
    avgValue,
    total,
    granularity,
  };
}
