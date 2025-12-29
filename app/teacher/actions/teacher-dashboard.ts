"use server";

import { getRevenueDetails, getStudentDetails, getCourseDetails, getLessonDetails } from "@/app/data/teacher/get-dashboard-details";

export async function fetchRevenueDetails() {
  return await getRevenueDetails();
}

export async function fetchStudentDetails() {
  return await getStudentDetails();
}

export async function fetchCourseDetails() {
  return await getCourseDetails();
}

export async function fetchLessonDetails() {
  return await getLessonDetails();
}
