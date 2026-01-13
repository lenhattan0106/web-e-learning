import { searchCoursesTool } from "@/lib/ai/tools/search-courses";
import { searchCoursesRAGTool } from "@/lib/ai/tools/search-courses-rag";
import { getAllCoursesTool } from "@/lib/ai/tools/get-all-courses";
import { getSystemStatsTool } from "@/lib/ai/tools/get-system-stats";
import { getMyProgressTool } from "@/lib/ai/tools/get-my-progress";
import { searchDiscountsTool } from "@/lib/ai/tools/search-discounts";
import { getInstructorStatsTool } from "@/lib/ai/tools/get-instructor-stats";
import { getMyCoursesTool } from "@/lib/ai/tools/get-my-courses";
import { getCourseStructureTool } from "@/lib/ai/tools/get-course-structure";
import { getDetailedInstructorDataTool } from "@/lib/ai/tools/get-detailed-instructor-data";
import { getRevenueAnalyticsTool } from "@/lib/ai/tools/get-revenue-analytics";
import { getStudentProgressTool } from "@/lib/ai/tools/get-student-progress";
import { recordUserFeedbackTool } from "@/lib/ai/tools/record-user-feedback";
import { getTeacherDashboardTool } from "@/lib/ai/tools/get-teacher-dashboard";
import { getAdminDashboardTool } from "@/lib/ai/tools/get-admin-dashboard";
import { getPendingReportsTool } from "@/lib/ai/tools/get-pending-reports";
import { getUserListTool } from "@/lib/ai/tools/get-user-list";
import { getRevenueByInstructorTool } from "@/lib/ai/tools/get-revenue-by-instructor";

// USER (Học viên Premium): Tìm kiếm + Học tập + RAG
const USER_TOOLS = {
  getAllCourses: getAllCoursesTool,             // Danh sách tất cả khóa học
  searchCourses: searchCoursesTool,             // Tìm bài học theo semantic
  searchCoursesRAG: searchCoursesRAGTool,       // Tìm khóa học theo semantic (RAG)
  searchDiscounts: searchDiscountsTool,         // Tìm mã giảm giá
  getMyProgress: getMyProgressTool,             // Tiến độ học tập cá nhân
  getMyCourses: getMyCoursesTool,               // Khóa học đã mua
  getStudentProgress: getStudentProgressTool,   // Chi tiết tiến độ
  getCourseStructure: getCourseStructureTool,   // Cấu trúc khóa học
  recordUserFeedback: recordUserFeedbackTool,   // Ghi feedback
};

// TEACHER (Giảng viên Premium): USER + Business Analytics
const TEACHER_TOOLS = {
  getRevenueAnalytics: getRevenueAnalyticsTool,
  getDetailedInstructorData: getDetailedInstructorDataTool,
  getTeacherDashboard: getTeacherDashboardTool,
  getInstructorStats: getInstructorStatsTool,
};

// ADMIN: All tools + System Stats + Admin Dashboard + User Management + Analytics
const ADMIN_TOOLS = {
  getSystemStats: getSystemStatsTool,
  getAdminDashboard: getAdminDashboardTool,         // Doanh thu + thống kê toàn hệ thống
  getPendingReports: getPendingReportsTool,         // Báo cáo bình luận chờ xử lý
  getUserList: getUserListTool,                      // Quản lý người dùng
  getRevenueByInstructor: getRevenueByInstructorTool, // Doanh thu theo từng giảng viên
};

export function getToolsForRole(role: string) {
  // USER: Base tools for premium learners
  if (role === "USER") {
    return { ...USER_TOOLS };
  }
  
  // TEACHER: User tools + Business tools
  if (role === "TEACHER") {
    return {
      ...USER_TOOLS,
      ...TEACHER_TOOLS,
    };
  }
  
  // ADMIN: All tools
  if (role === "ADMIN") {
    return {
      ...USER_TOOLS,
      ...TEACHER_TOOLS,
      ...ADMIN_TOOLS,
    };
  }
  
  return {};
}

/**
 * Get list of tool names for a role (for logging/debugging)
 */
export function getToolNamesForRole(role: string): string[] {
  const tools = getToolsForRole(role);
  return Object.keys(tools);
}

