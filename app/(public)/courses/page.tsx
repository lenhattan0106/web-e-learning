import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllCoursesWithOwnership } from "@/app/data/course/get-all-courses-with-ownership";
import { PublicCourseCard, PublicCourseCardSkeleton } from "../_components/PublicCourseCard";
import { CourseFilters } from "./_components/CourseFilters";
import { BookOpen } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    levelId?: string;
  }>;
}

export default async function PublicCoursesRoute({ searchParams }: PageProps) {
  // Fetch categories and levels for filters
  const [categories, levels] = await Promise.all([
    prisma.danhMuc.findMany({
      orderBy: { tenDanhMuc: "asc" },
      where: { idDanhMucCha: null },
      include: {
        danhMucCon: {
          orderBy: { tenDanhMuc: "asc" },
          include: {
            danhMucCon: {
              orderBy: { tenDanhMuc: "asc" },
            },
          },
        },
      },
    }),
    prisma.capDo.findMany({
      orderBy: { tenCapDo: "asc" },
    }),
  ]);

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

      {/* Filter Component */}
      <CourseFilters categories={categories} levels={levels} />

      <Suspense fallback={<LoadingSkeletonLayout />}>
        <RenderCourses searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RenderCourses({ searchParams }: { searchParams: PageProps["searchParams"] }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const params = await searchParams;
  
  const courses = await getAllCoursesWithOwnership({
    keyword: params.q,
    categoryId: params.categoryId,
    levelId: params.levelId,
  });
  
  const userRole = session?.user?.role as "user" | "teacher" | "admin" | undefined;

  // No results state
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Không có khóa học phù hợp</h3>
        <p className="text-muted-foreground max-w-md">
          Không tìm thấy khóa học nào phù hợp với tiêu chí tìm kiếm của bạn. 
          Vui lòng thử lại với từ khóa hoặc bộ lọc khác.
        </p>
      </div>
    );
  }

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

function LoadingSkeletonLayout() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, index) => (
        <PublicCourseCardSkeleton key={index} />
      ))}
    </div>
  );
}