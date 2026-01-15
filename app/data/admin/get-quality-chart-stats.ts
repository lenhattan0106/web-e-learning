import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

interface QualityTrendData {
  label: string;
  month: string;
  reports: number;
  resolved: number;
  avgRating: number;
}

interface ReportTypeData {
  label: string;
  value: number;
  color: string;
}

interface QualityChartStats {
  trendData: QualityTrendData[];
  reportTypeData: ReportTypeData[]; 
  distributionByType: ReportTypeData[];
  distributionByStatus: ReportTypeData[];
  currentAvgRating: number;
  pendingReports: number;
}

/**
 * Get quality metrics statistics for charts
 * Used by QualityAnalysisChart on /admin/quality-control page
 */
export async function getQualityChartStats(
  fromDate: Date,
  toDate: Date
): Promise<QualityChartStats> {
  await requireAdmin();

  // Calculate date difference for granularity decision
  const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let granularity: "day" | "week" | "month";
  if (diffDays <= 30) {
    granularity = "day";
  } else if (diffDays <= 90) {
    granularity = "week";
  } else {
    granularity = "month";
  }

  // ✅ OPTIMIZATION: Parallelize all database queries
  const [
    commentReports,
    courseReports,
    ratings,
    avgRatingAgg,
    pendingComments,
    pendingCourses
  ] = await Promise.all([
    // Get comment reports
    prisma.baoCaoBinhLuan.findMany({
      where: { ngayTao: { gte: fromDate, lte: toDate } },
      select: { trangThai: true, ngayTao: true },
    }),
    // Get course reports
    (prisma as any).baoCaoKhoaHoc.findMany({
      where: { ngayTao: { gte: fromDate, lte: toDate } },
      select: { trangThai: true, ngayTao: true },
    }).catch(() => [] as { trangThai: string; ngayTao: Date }[]),
    // Get ratings
    prisma.danhGia.findMany({
      where: {
        trangThai: "HIEN",
        ngayTao: { gte: fromDate, lte: toDate },
      },
      select: { diemDanhGia: true, ngayTao: true },
    }),
    // Get current overall avg rating
    prisma.danhGia.aggregate({
      where: { trangThai: "HIEN" },
      _avg: { diemDanhGia: true },
    }),
    // Get pending counts
    prisma.baoCaoBinhLuan.count({
      where: { trangThai: "ChoXuLy" },
    }),
    (prisma as any).baoCaoKhoaHoc.count({
      where: { trangThai: "ChoXuLy" },
    }).catch(() => 0),
  ]);

  // Initialize data buckets
  const dataMap: Record<string, {
    reports: number;
    resolved: number;
    ratingSum: number;
    ratingCount: number;
  }> = {};
  
  const labelMap: Record<string, string> = {};

  // Populate all keys in the range
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
      key = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
      label = `${monthNames[iterDate.getMonth()]} ${iterDate.getFullYear()}`;
      iterDate.setMonth(iterDate.getMonth() + 1);
      iterDate.setDate(1);
    }

    if (key) {
      dataMap[key] = { reports: 0, resolved: 0, ratingSum: 0, ratingCount: 0 };
      labelMap[key] = label;
    }
  }

  // Helper to find bucket key
  const getBucketKey = (date: Date): string => {
    if (granularity === "day") {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    } else if (granularity === "week") {
      const daysFromStart = Math.floor((date.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysFromStart / 7);
      const weekStart = new Date(fromDate);
      weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
      return `week-${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
  };

  // Populate reports data
  const allReports = [...commentReports, ...courseReports];
  allReports.forEach((r) => {
    const key = getBucketKey(r.ngayTao);
    if (dataMap[key]) {
      dataMap[key].reports++;
      if (r.trangThai === "DaXuLy") {
        dataMap[key].resolved++;
      }
    }
  });

  // Populate ratings data
  ratings.forEach((r) => {
    const key = getBucketKey(r.ngayTao);
    if (dataMap[key] && r.diemDanhGia) {
      dataMap[key].ratingSum += r.diemDanhGia;
      dataMap[key].ratingCount++;
    }
  });

  // Convert to trend data array
  const trendData: QualityTrendData[] = Object.entries(dataMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, val]) => ({
      label: labelMap[key] || key,
      month: key,
      reports: val.reports,
      resolved: val.resolved,
      avgRating: val.ratingCount > 0 ? val.ratingSum / val.ratingCount : 0,
    }));

  // Calculate report type distribution
  const courseReportCount = courseReports.length;
  const commentReportCount = commentReports.length;
  
  const distributionByType: ReportTypeData[] = [
    { label: "Báo cáo khóa học", value: courseReportCount, color: "#ef4444" },
    { label: "Báo cáo bình luận", value: commentReportCount, color: "#f97316" },
  ].filter((d) => d.value > 0);

  // Calculate Status distribution
  const pendingTotal = pendingComments + pendingCourses;
  const resolvedTotal = allReports.filter((r) => r.trangThai === "DaXuLy").length;
  
  const distributionByStatus: ReportTypeData[] = [
    { label: "Chờ xử lý", value: pendingTotal, color: "#eab308" },
    { label: "Đã xử lý", value: resolvedTotal, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  return {
    trendData,
    distributionByType,   
    distributionByStatus, 
    reportTypeData: distributionByType, 
    currentAvgRating: avgRatingAgg._avg.diemDanhGia || 0,
    pendingReports: pendingTotal,
  };
}
