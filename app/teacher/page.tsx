import { ChartAreaInteractive } from "@/components/sidebar/chart-area-interactive";
import { SectionCards } from "@/components/sidebar/section-cards";
import { teacherGetEnrollmentStats } from "../data/teacher/get-enrollment-stats";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { teacherGetRecentCourses } from "../data/teacher/get-recent-courses";
import { EmptyState } from "@/components/general/EmtyState";
import { TeacherCourseCard, TeacherCourseCardSkeleton } from "./courses/_components/TeacherCourseCard";
import { Suspense } from "react";

export default async function TeacherIndexPage() {
  const enrollmentData = await teacherGetEnrollmentStats();

  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive data={enrollmentData} />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Các khóa học gần đây</h2>
          <Link className={buttonVariants({ variant: "outline" })} href="/teacher/courses">
            Xem tất cả khóa học
          </Link>
        </div>
        <Suspense fallback={<RenderRecentCourseSkeleton />}>
          <RenderRecentCourse />
        </Suspense>
      </div>
    </>
  );
}

async function RenderRecentCourse() {
  const data = await teacherGetRecentCourses();
  if (data.length === 0) {
    return (
      <EmptyState
        buttonText="Tạo khóa học mới"
        description="Không có bất cứ khóa học nào được tạo. Hãy tạo một số mẫu để xem chúng ở đây."
        title="Bạn chưa có bất kì khóa học nào"
        href="/teacher/courses/create"
      />
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {data.map((course) => (
        <TeacherCourseCard data={course} key={course.id} />
      ))}
    </div>
  );
}

function RenderRecentCourseSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TeacherCourseCardSkeleton />
      <TeacherCourseCardSkeleton />
    </div>
  );
}