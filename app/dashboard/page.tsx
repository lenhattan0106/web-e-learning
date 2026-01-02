import { EmptyState } from "@/components/general/EmtyState";
import { getAllCoursesWithOwnership } from "../data/course/get-all-courses-with-ownership";
import { getEnrolledCourses } from "../data/user/get-enrolled-courses";
import { PublicCourseCard } from "../(public)/_components/PublicCourseCard";
import { CourseProgressCard } from "./_components/CourseProgressCard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userRole = session?.user?.role as "user" | "teacher" | "admin" | undefined;

  const [courses, enrolledCourses] = await Promise.all([
    getAllCoursesWithOwnership(),
    getEnrolledCourses(),
  ]);

  // Lọc các khóa học chưa mua
  const availableCourses = courses.filter(
    (course) =>
      !enrolledCourses.some((enrollment) => enrollment.khoaHoc.id === course.id)
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">Khóa học hiện tại</h1>
        <p className="text-muted-foreground text-sm">
          Tiếp tục hành trình học tập của bạn với các khóa học đã đăng ký
        </p>
      </div>
      {enrolledCourses.length === 0 ? (
        <EmptyState
          title="Bạn chưa mua khóa học nào"
          description="Khám phá và đăng ký các khóa học để bắt đầu học tập"
          buttonText="Tìm kiếm khóa học"
          href="/courses"
        ></EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrolledCourses.map((enrollment) => (
             <CourseProgressCard key={enrollment.khoaHoc.id} data={enrollment}></CourseProgressCard>
          ))}
        </div>
      )}
      <section className="mt-8">
        <div className="flex flex-col gap-2 mb-2">
          <h1 className="text-xl font-bold">Khóa học có sẵn</h1>
          <p className="text-muted-foreground text-sm">
            Khám phá thêm các khóa học mới để mở rộng kiến thức
          </p>
        </div>
        {availableCourses.length === 0 ? (
          <EmptyState
            title="Các khóa học hiện có đã hết"
            description="Hãy đợi các khóa học khác trong thời gian sắp tới nhé"
            buttonText="Tìm kiếm khóa học"
            href="/courses"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableCourses.map((course) => (
              <PublicCourseCard
                key={course.id}
                data={course}
                isOwner={course.isOwner}
                userRole={userRole}
              ></PublicCourseCard>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
