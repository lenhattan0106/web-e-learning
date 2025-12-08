import { adminGetCourse } from "@/app/data/admin/get-courses";
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
        <Link className={buttonVariants()} href="/admin/courses/create">
          Tạo khóa học
        </Link>
      </div>
      <div>
        <h1>Ở đây bạn sẽ thấy tất cả các khóa học của bạn</h1>
      </div>
      <Suspense fallback={<AdminCourseSkeletonLayout/>}>
      <RenderCourse></RenderCourse>
      </Suspense>
    </>
  );
}

async function RenderCourse() {
    const data = await adminGetCourse();
    return(
      <>
        {data.length === 0 ? (
        <EmptyState title="Không tìm thấy khóa học" description="Hãy tạo các khóa học mới để bắt đầu" buttonText="Tạo khóa học" href="/admin/courses/create"/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-7">
          {data.map((course) => (
            <TeacherCourseCard
              key={course.id}
              data={course}
            ></TeacherCourseCard>
          ))}
        </div>
      )}
      </>
    )
}
function AdminCourseSkeletonLayout(){
  return(
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-7">
        {Array.from({length:4}).map((_,index)=>(
          <TeacherCourseCardSkeleton key={index}></TeacherCourseCardSkeleton>
        ))}
     </div>
  )
}