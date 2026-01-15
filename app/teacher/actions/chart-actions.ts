"use server";

import { getDashboardChartData } from "@/app/data/teacher/get-chart-data";

type TabType = "revenue" | "students" | "courses" | "lessons";

export async function fetchDashboardChartData(
  from: string, // ISO string
  to: string,   // ISO string  
  tab: TabType
) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  return await getDashboardChartData({
    from: fromDate,
    to: toDate,
    tab,
  });
}
