import { teacherGetCourses } from "@/app/data/teacher/get-courses";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TeacherCourseCard, TeacherCourseCardSkeleton } from "./_components/TeacherCourseCard";
import { EmptyState } from "@/components/general/EmtyState";
import { Suspense } from "react";

export default function CoursesPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Khóa học</h1>
        <Link className={buttonVariants()} href="/teacher/courses/create">
          Tạo khóa học
        </Link>
      </div>
      <div>
        <h1>Ở đây bạn sẽ thấy tất cả các khóa học của bạn</h1>
      </div>
      <Suspense fallback={<TeacherCourseSkeletonLayout />}>
        <RenderCourse />
      </Suspense>
    </>
  );
}

async function RenderCourse() {
  const data = await teacherGetCourses();
  return (
    <>
      {data.length === 0 ? (
        <EmptyState
          title="Không tìm thấy khóa học"
          description="Hãy tạo các khóa học mới để bắt đầu"
          buttonText="Tạo khóa học"
          href="/teacher/courses/create"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((course) => (
            <TeacherCourseCard data={course} key={course.id} />
          ))}
        </div>
      )}
    </>
  );
}

function TeacherCourseSkeletonLayout() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TeacherCourseCardSkeleton />
      <TeacherCourseCardSkeleton />
      <TeacherCourseCardSkeleton />
      <TeacherCourseCardSkeleton />
    </div>
  );
}