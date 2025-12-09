import { getAllCourses } from "@/app/data/course/get-all-courses";
import { PublicCourseCard, PublicCourseCardSkeleton } from "../_components/PublicCourseCard";
import { Suspense } from "react";

export default function PublicCoursesRoute() {
  return (
    <div className="mt-5">
      <div className="flex flex-col space-y-2 mb-10">
        <h1 className="text-3xl md:text-4xl font-medium tracking-tighter">
          Khám phá các khóa học hiện tại
        </h1>
        <p className="text-muted-foreground">
          Khám phá nhiều khóa học đa dạng của chúng tôi được thiết kế để giúp
          bạn đạt được mục tiêu học tập của mình
        </p>
      </div>
      <Suspense  fallback={<LoadingSkeletonLayout></LoadingSkeletonLayout>}>
      <RenderCourses></RenderCourses>
      </Suspense>
    </div>
  );
}

async function RenderCourses(){
    const courses = await getAllCourses();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {courses.map((course)=>(
                  <PublicCourseCard data={course} key={course.id}></PublicCourseCard>
               ))}
        </div>
    )
}

function LoadingSkeletonLayout(){
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({length:9}).map((_,index)=>(
            <PublicCourseCardSkeleton key={index}></PublicCourseCardSkeleton>
        ))}
    </div>
}