import { QualityControlClient } from "./_components/QualityControlClient";
import { getLowRatedCourses, getReportedCourses, getReportedComments } from "@/app/data/admin/get-quality-stats";
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

  const [lowRated, reportedLayer1, reportedLayer2] = await Promise.all([
    getLowRatedCourses(),
    getReportedCourses(), // Reported Courses
    getReportedComments(), // Reported Comments
  ]);

  return (
    <QualityControlClient 
        lowRatedCourses={lowRated}
        reportedCourses={reportedLayer1}
        reportedComments={reportedLayer2}
    />
  );
}
