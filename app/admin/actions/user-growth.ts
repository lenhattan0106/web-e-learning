"use server";

import { getUserGrowthStats } from "@/app/data/admin/get-user-growth-stats";

export async function fetchUserGrowthData(
  fromDateISO: string,
  toDateISO: string
) {
  const fromDate = new Date(fromDateISO);
  const toDate = new Date(toDateISO);
  
  return await getUserGrowthStats(fromDate, toDate);
}
