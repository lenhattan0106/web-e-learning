"use server";

import { getQualityChartStats } from "@/app/data/admin/get-quality-chart-stats";

export async function fetchQualityChartData(
  fromDateISO: string,
  toDateISO: string
) {
  const fromDate = new Date(fromDateISO);
  const toDate = new Date(toDateISO);
  
  return await getQualityChartStats(fromDate, toDate);
}
