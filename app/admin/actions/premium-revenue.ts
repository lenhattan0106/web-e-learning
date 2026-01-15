"use server";

import { getPremiumRevenueStats } from "@/app/data/admin/get-premium-revenue-stats";

export async function fetchPremiumRevenueData(
  fromDateISO: string,
  toDateISO: string
) {
  const fromDate = new Date(fromDateISO);
  const toDate = new Date(toDateISO);
  
  return await getPremiumRevenueStats(fromDate, toDate);
}
