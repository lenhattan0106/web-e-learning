import { EmptyState } from "@/components/general/EmtyState";
import { getEnrolledCourses } from "../data/user/get-enrolled-courses";
import { getRelatedCourses } from "../data/user/get-related-courses";
import { PublicCourseCard } from "../(public)/_components/PublicCourseCard";
import { CourseProgressCard } from "./_components/CourseProgressCard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Sparkles, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userRole = session?.user?.role as "user" | "teacher" | "admin" | undefined;

  const enrolledCourses = await getEnrolledCourses();
  
  // Lấy danh sách ID các khóa học đã đăng ký
  const enrolledCourseIds = enrolledCourses.map((e) => e.khoaHoc.id);
  
  // Lấy khóa học gợi ý dựa trên Vector Embedding
  const relatedCoursesResult = await getRelatedCourses(enrolledCourseIds);

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
      
      {/* Section: Khóa học gợi ý */}
      <section className="mt-8">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            {relatedCoursesResult.type === "related" ? (
              <Sparkles className="h-5 w-5 text-amber-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-blue-500" />
            )}
            <h1 className="text-xl font-bold">
              {relatedCoursesResult.type === "related" 
                ? "Gợi ý dành riêng cho bạn" 
                : "Khóa học phổ biến"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {relatedCoursesResult.type === "related"
              ? "Được gợi ý dựa trên các khóa học bạn đang theo dõi"
              : "Khám phá những khóa học được nhiều học viên yêu thích"}
          </p>
        </div>
        
        {relatedCoursesResult.courses.length === 0 ? (
          <EmptyState
            title="Chưa có khóa học phù hợp"
            description="Hãy đợi các khóa học mới trong thời gian sắp tới nhé"
            buttonText="Khám phá tất cả khóa học"
            href="/courses"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedCoursesResult.courses.map((course) => (
              <PublicCourseCard
                key={course.id}
                data={{
                  id: course.id,
                  tenKhoaHoc: course.tenKhoaHoc,
                  moTaNgan: course.moTaNgan,
                  gia: course.gia,
                  duongDan: course.duongDan,
                  tepKH: course.tepKH,
                  thoiLuong: course.thoiLuong,
                  danhMuc: course.danhMuc,
                  capDo: "NguoiMoi",
                  idNguoiDung: course.nguoiDung.id,
                  trangThai: "BanChinhThuc",
                  danhMucRef: course.danhMuc ? { id: "", tenDanhMuc: course.danhMuc, danhMucCha: null } : null,
                  capDoRef: course.capDo ? { id: "", tenCapDo: course.capDo } : null,
                  nguoiDung: course.nguoiDung,
                  danhGias: [],
                  isOwner: false,
                  isArchived: false,
                }}
                isOwner={false}
                userRole={userRole}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
