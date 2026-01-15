import { QualityControlClient } from "./_components/QualityControlClient";
import { getLowRatedCourses, getReportedCourses, getReportedComments } from "@/app/data/admin/get-quality-stats";
import { getQualityChartStats } from "@/app/data/admin/get-quality-chart-stats";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function QualityControlPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  // Default date range: last 30 days
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30);

  const [lowRated, reportedLayer1, reportedLayer2, chartStats] = await Promise.all([
    getLowRatedCourses(),
    getReportedCourses(), // Reported Courses
    getReportedComments(), // Reported Comments
    getQualityChartStats(fromDate, toDate), // Default 30 days
  ]);

  return (
    <QualityControlClient 
        lowRatedCourses={lowRated}
        reportedCourses={reportedLayer1}
        reportedComments={reportedLayer2}
        chartStats={chartStats}
    />
  );
}

