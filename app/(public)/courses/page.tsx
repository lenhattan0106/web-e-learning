import { getAllCoursesWithOwnership } from "@/app/data/course/get-all-courses-with-ownership";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PublicCourseCard, PublicCourseCardSkeleton } from "../_components/PublicCourseCard";
import { Suspense } from "react";

export default function PublicCoursesRoute() {
  return (
    <div className="mt-5">
      <div className="flex flex-col space-y-2 mb-6">
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

async function RenderCourses() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const courses = await getAllCoursesWithOwnership();
  const userRole = session?.user?.role as "user" | "teacher" | "admin" | undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((course) => (
        <PublicCourseCard
          key={course.id}
          data={course}
          isOwner={course.isOwner}
          userRole={userRole}
        />
      ))}
    </div>
  );
}

function LoadingSkeletonLayout(){
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({length:9}).map((_,index)=>(
            <PublicCourseCardSkeleton key={index}></PublicCourseCardSkeleton>
        ))}
    </div>
}