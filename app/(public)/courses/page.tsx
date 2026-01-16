import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db"; // Keep prisma if needed elsewhere? No, remove if unused. Actually keeping it safe.
import { getAllCoursesWithOwnership } from "@/app/data/course/get-all-courses-with-ownership";
import { getCategoriesCached, getLevelsCached } from "@/app/data/public/get-common-data";
import { PublicCourseCard, PublicCourseCardSkeleton } from "../_components/PublicCourseCard";
import { CourseFilters } from "./_components/CourseFilters";
import { BookOpen, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    levelId?: string;
    tab?: string;
  }>;
}

export default async function PublicCoursesRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const sessionPromise = auth.api.getSession({
    headers: await headers(),
  });
  
  const categoriesPromise = getCategoriesCached();
  const levelsPromise = getLevelsCached();

  const session = await sessionPromise;

  const coursesPromise = getAllCoursesWithOwnership({
    keyword: params.q,
    categoryId: params.categoryId,
    levelId: params.levelId,
    tab: params.tab,
  }, session?.user ? { id: session.user.id, role: session.user.role } : undefined);

  const [categories, levels, courses, totalMatchingAllTab] = await Promise.all([
    categoriesPromise,
    levelsPromise,
    coursesPromise,
    (params.tab === "free" || params.tab === "purchased") 
      ? import("@/app/data/course/get-all-courses-with-ownership").then(mod => mod.countAllCourses({
          keyword: params.q,
          categoryId: params.categoryId,
          levelId: params.levelId,
        }))
      : Promise.resolve(0)
  ]);
  
  const userRole = session?.user?.role as "user" | "teacher" | "admin" | undefined;

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

      {/* Courses List */}
      {courses.length === 0 ? (
        <EmptyState tab={params.tab} totalMatchingAllTab={totalMatchingAllTab} />
      ) : (
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
      )}
    </div>
  );
}

function EmptyState({ tab, totalMatchingAllTab = 0 }: { tab?: string; totalMatchingAllTab?: number }) {
  if (tab === "purchased") {
    if (totalMatchingAllTab > 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 md:py-16 text-center border-2 border-dashed border-muted rounded-xl bg-slate-50/50">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Không tìm thấy khóa học nào trong Kho của bạn</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Chúng tôi không tìm thấy khóa học nào đã mua khớp với bộ lọc hiện tại. 
            Tuy nhiên, có <strong>{totalMatchingAllTab}</strong> khóa học phù hợp trong kho khóa học chung.
          </p>
          <Button asChild>
            <Link href="/courses?tab=all">Xem {totalMatchingAllTab} kết quả ở mục Tất cả</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Bạn chưa sở hữu khóa học nào</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Bạn chưa đăng ký khóa học nào. Hãy khám phá kho tàng kiến thức của chúng tôi ngay hôm nay!
        </p>
        <Button asChild>
          <Link href="/courses?tab=all">Khám phá ngay</Link>
        </Button>
      </div>
    );
  }

  if (tab === "free") {
     if (totalMatchingAllTab > 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 md:py-16 text-center border-2 border-dashed border-muted rounded-xl bg-slate-50/50">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Không tìm thấy khóa học Miễn phí phù hợp</h3>
          <p className="text-muted-foreground max-w-md mb-6">
             Tuy nhiên, chúng tôi tìm thấy <strong>{totalMatchingAllTab}</strong> khóa học trả phí khớp với tìm kiếm của bạn.
          </p>
          <Button asChild>
            <Link href="/courses?tab=all">Xem kết quả ở Tab Tất cả</Link>
          </Button>
        </div>
      );
    }
  }

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