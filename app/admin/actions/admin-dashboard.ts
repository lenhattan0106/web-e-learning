"use server";

import { getUserDetails, getRevenueDetails, getPremiumDetails, getCourseDetailsForAdmin } from "@/app/data/admin/get-admin-dashboard-details";
import { getReportedComments } from "@/app/data/admin/get-reported-comments";

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
  return await getReportedComments();
}

export async function fetchCourseDetails() {
  return await getCourseDetailsForAdmin();
}
