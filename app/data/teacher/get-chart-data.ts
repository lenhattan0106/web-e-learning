import "server-only";
import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";

// Types
type TabType = "revenue" | "students" | "courses" | "lessons";
type Granularity = "day" | "month";

interface ChartDataOptions {
  from: Date;
  to: Date;
  tab: TabType;
}

interface ChartDataResult {
  chartData: Array<{ 
    label: string; 
    value: number; 
    prevValue?: number; 
    prevDateLabel?: string;
    fullDate?: string;
    // ✅ THÊM: Chi tiết enrollments cho tooltip
    details?: Array<{
      studentName: string;
      studentEmail: string;
      courseName: string;
      netPrice: number;
    }>;
  }>;
  avgValue: number;
  granularity: Granularity;
}

// Helper: Calculate diff days
function getDiffDays(from: Date, to: Date): number {
  return Math.ceil(Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper: Format date to label based on granularity (X-axis)
function formatDateLabel(date: Date, granularity: Granularity): string {
  if (granularity === "month") {
    return `Th.${date.getMonth() + 1}/${date.getFullYear()}`;
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// Helper: Format full date for tooltip
function formatFullDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// Helper: Generate all buckets
function generateBuckets(from: Date, to: Date, granularity: Granularity) {
  const buckets: Array<{ label: string; date: Date }> = [];
  const current = new Date(from);
  
  // Clone to avoid modifying 'from'
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);
  
  while (current <= endDate) {
    buckets.push({
      label: formatDateLabel(current, granularity),
      date: new Date(current),
    });
    
    if (granularity === "month") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }
  
  return buckets;
}

// Helper: Calculate previous period range
function getPreviousPeriod(from: Date, to: Date): { prevFrom: Date; prevTo: Date; diffMs: number } {
  const diffMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1); // 1ms before current period
  const prevFrom = new Date(prevTo.getTime() - diffMs);
  return { prevFrom, prevTo, diffMs };
}

// Main function: Get chart data based on tab
export async function getDashboardChartData(options: ChartDataOptions): Promise<ChartDataResult> {
  const { from, tab } = options;
  // Ensure 'to' is end of day for proper database query
  const to = new Date(options.to);
  to.setHours(23, 59, 59, 999);
  
  const session = await requireTeacher();
  const userId = session.user.id;
  
  const diffDays = getDiffDays(from, to);
  const granularity: Granularity = diffDays > 90 ? "month" : "day";
  
  // Get previous period for comparison tooltip
  const { prevFrom, prevTo, diffMs } = getPreviousPeriod(from, to);
  
  let chartData: ChartDataResult["chartData"] = [];
  let avgValue = 0;
  
  switch (tab) {
    case "revenue":
      chartData = await getRevenueData(userId, from, to, prevFrom, prevTo, granularity, diffMs);
      break;
    case "students":
      chartData = await getStudentsData(userId, from, to, prevFrom, prevTo, granularity, diffMs);
      break;
    case "courses":
      chartData = await getCoursesData(userId);
      break;
    case "lessons":
      chartData = await getLessonsData(userId);
      break;
  }
  
  // Calculate average (exclude prevValue)
  if (chartData.length > 0 && tab !== "courses" && tab !== "lessons") {
    const sum = chartData.reduce((acc, item) => acc + item.value, 0);
    avgValue = Math.round(sum / chartData.length);
  }
  
  return { chartData, avgValue, granularity };
}

// Revenue data for Area Chart
async function getRevenueData(
  userId: string,
  from: Date,
  to: Date,
  prevFrom: Date,
  prevTo: Date,
  granularity: Granularity,
  diffMs: number
) {
  // Current period - ✅ Sử dụng thanhToanThuc (Net) thay vì soTien (Gross)
  const currentData = await prisma.dangKyHoc.findMany({
    where: {
      khoaHoc: { idNguoiDung: userId },
      trangThai: "DaThanhToan",
      ngayTao: { gte: from, lte: to },
    },
    select: { 
      ngayTao: true, 
      soTien: true,
      phiSan: true,
      thanhToanThuc: true,
    },
  });
  
  // Previous period - ✅ Cũng dùng Net
  const prevData = await prisma.dangKyHoc.findMany({
    where: {
      khoaHoc: { idNguoiDung: userId },
      trangThai: "DaThanhToan",
      ngayTao: { gte: prevFrom, lte: prevTo },
    },
    select: { 
      ngayTao: true, 
      soTien: true,
      phiSan: true,
      thanhToanThuc: true,
    },
  });
  
  // Map current data - ✅ Tính Net Revenue
  const currentMap = new Map<string, number>();
  currentData.forEach((item) => {
    const label = formatDateLabel(new Date(item.ngayTao), granularity);
    const existing = currentMap.get(label) || 0;
    // Tính thực nhận: thanhToanThuc hoặc (soTien - phiSan) hoặc (soTien * 0.95)
    const netRevenue = item.thanhToanThuc ?? 
      (item.soTien - (item.phiSan ?? Math.round(item.soTien * 0.05)));
    currentMap.set(label, existing + netRevenue);
  });
  
  // Map previous data - ✅ Tính Net Revenue
  const prevMap = new Map<string, number>();
  prevData.forEach((item) => {
    const label = formatDateLabel(new Date(item.ngayTao), granularity);
    const existing = prevMap.get(label) || 0;
    const netRevenue = item.thanhToanThuc ?? 
      (item.soTien - (item.phiSan ?? Math.round(item.soTien * 0.05)));
    prevMap.set(label, existing + netRevenue);
  });
  
  // Generate unified buckets
  const buckets = generateBuckets(from, to, granularity);
  
  const result: ChartDataResult["chartData"] = buckets.map(({ label, date }) => {
    // Determine the corresponding label/date in previous period
    // Since we group by label, we need to be careful with the mapping
    // Simple approach: map order by index if buckets match size, but here date ranges differ
    // Better: calculate previous date for this specific bucket
    const prevDate = new Date(date.getTime() - (diffMs + 1)); // approximate
    const prevLabel = formatDateLabel(prevDate, granularity);
    
    // BUT prevMap is keyed by labels generated from ACTUAL prevData dates
    // If granularity is day, prevLabel will match key in prevMap
    
    // For Month granularity, this approximate deduction is tricky due to varying month lengths
    // However, for visualization, we mostly care about the value at position i
    
    return {
      label,
      value: currentMap.get(label) || 0,
      prevValue: 0, // Will be filled below based on position if needed, or mapping by date
      fullDate: formatFullDate(date),
      prevDateLabel: formatFullDate(prevDate),
    };
  });
  
  // Fill prevValue by index logic (aligning periods) works best for comparison
  // Because "Jan 14" vs "Jan 7" (7 days ago)
  const prevBuckets = generateBuckets(prevFrom, prevTo, granularity);
  
  result.forEach((item, index) => {
    if (prevBuckets[index]) {
      const pLabel = prevBuckets[index].label;
      const pVal = prevMap.get(pLabel) || 0;
      item.prevValue = pVal;
      item.prevDateLabel = formatFullDate(prevBuckets[index].date);
    }
  });
  
  return result;
}

// Students data for Composed Chart (Bar + Line)
async function getStudentsData(
  userId: string,
  from: Date,
  to: Date,
  prevFrom: Date,
  prevTo: Date,
  granularity: Granularity,
  diffMs: number
) {
  // ✅ Lấy FULL DATA thay vì chỉ ngayTao
  const enrollments = await prisma.dangKyHoc.findMany({
    where: {
      khoaHoc: { idNguoiDung: userId },
      trangThai: "DaThanhToan",
      ngayTao: { gte: from, lte: to },
    },
    select: { 
      ngayTao: true,
      soTien: true,
      phiSan: true,
      thanhToanThuc: true,
      nguoiDung: {
        select: {
          name: true,
          email: true,
        }
      },
      khoaHoc: {
        select: {
          tenKhoaHoc: true,
        }
      }
    },
  });
  
  // Previous period (chỉ cần count)
  const prevEnrollments = await prisma.dangKyHoc.findMany({
    where: {
      khoaHoc: { idNguoiDung: userId },
      trangThai: "DaThanhToan",
      ngayTao: { gte: prevFrom, lte: prevTo },
    },
    select: { ngayTao: true },
  });
  
  // ✅ Map với chi tiết
  const currentMap = new Map<string, Array<{
    studentName: string;
    studentEmail: string;
    courseName: string;
    netPrice: number;
  }>>();
  
  enrollments.forEach((item) => {
    const label = formatDateLabel(new Date(item.ngayTao), granularity);
    const netPrice = item.thanhToanThuc ?? 
      (item.soTien - (item.phiSan ?? Math.round(item.soTien * 0.05)));
    
    if (!currentMap.has(label)) {
      currentMap.set(label, []);
    }
    
    currentMap.get(label)!.push({
      studentName: item.nguoiDung.name || 'Unknown',
      studentEmail: item.nguoiDung.email,
      courseName: item.khoaHoc.tenKhoaHoc,
      netPrice: netPrice,
    });
  });
  
  const prevMap = new Map<string, number>();
  prevEnrollments.forEach((item) => {
    const label = formatDateLabel(new Date(item.ngayTao), granularity);
    const existing = prevMap.get(label) || 0;
    prevMap.set(label, existing + 1);
  });
  
  const buckets = generateBuckets(from, to, granularity);
  const prevBuckets = generateBuckets(prevFrom, prevTo, granularity);
  
  const result: ChartDataResult["chartData"] = buckets.map(({ label, date }, index) => {
    const prevBucket = prevBuckets[index];
    const prevVal = prevBucket ? (prevMap.get(prevBucket.label) || 0) : 0;
    const details = currentMap.get(label) || [];
    
    return {
      label,
      value: details.length, // Số lượng enrollments
      prevValue: prevVal,
      fullDate: formatFullDate(date),
      prevDateLabel: prevBucket ? formatFullDate(prevBucket.date) : undefined,
      details: details, // ✅ Chi tiết từng lượt mua
    };
  });
  
  return result;
}

// Courses data for Horizontal Bar Chart (Top 5 by revenue) - ✅ Dùng Net Revenue
async function getCoursesData(userId: string) {
  const courses = await prisma.khoaHoc.findMany({
    where: { idNguoiDung: userId },
    select: {
      id: true,
      tenKhoaHoc: true,
      dangKyHocs: {
        where: { trangThai: "DaThanhToan" },
        select: { 
          soTien: true,
          phiSan: true,
          thanhToanThuc: true,
        },
      },
    },
  });
  
  // Calculate NET revenue per course
  const courseRevenue = courses.map((course) => {
    const netTotal = course.dangKyHocs.reduce((sum, d) => {
      const netRevenue = d.thanhToanThuc ?? 
        (d.soTien - (d.phiSan ?? Math.round(d.soTien * 0.05)));
      return sum + netRevenue;
    }, 0);
    
    return {
      label: course.tenKhoaHoc,
      value: netTotal,
      courseId: course.id,
      enrollments: course.dangKyHocs.length,
    };
  });
  
  // Sort by revenue desc, take top 5
  return courseRevenue
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

// Lessons data for Donut Chart (Video vs Non-video)
async function getLessonsData(userId: string) {
  const lessons = await prisma.baiHoc.findMany({
    where: {
      chuong: { khoaHoc: { idNguoiDung: userId } },
    },
    select: { maVideo: true },
  });
  
  const videoCount = lessons.filter((l) => l.maVideo && l.maVideo.trim() !== "").length;
  const nonVideoCount = lessons.length - videoCount;
  const videoRatio = lessons.length > 0 ? Math.round((videoCount / lessons.length) * 100) : 0;
  
  return [
    { label: "Video", value: videoCount, color: "#22c55e" },
    { label: "Chưa có video", value: nonVideoCount, color: "#94a3b8", videoRatio },
  ];
}
