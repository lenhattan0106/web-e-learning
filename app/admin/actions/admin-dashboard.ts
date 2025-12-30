"use server";

import { getUserDetails, getRevenueDetails, getPremiumDetails, getReportsDetails, getCourseDetailsForAdmin } from "@/app/data/admin/get-admin-dashboard-details";

export async function fetchUserDetails() {
  return await getUserDetails();
}

export async function fetchRevenueDetails() {
  return await getRevenueDetails();
}

export async function fetchPremiumDetails() {
  return await getPremiumDetails();
}

export async function fetchReportsDetails() {
  return await getReportsDetails();
}

export async function fetchCourseDetails() {
  return await getCourseDetailsForAdmin();
}
