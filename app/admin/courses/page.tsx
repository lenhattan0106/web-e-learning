import { adminGetCourse } from "@/app/data/admin/get-courses";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TeacherCourseCard } from "./_components/TeacherCourseCard";

export default async function CoursesPage(){
    const data = await adminGetCourse();
    return (
        <>
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Khóa học</h1>
            <Link className={buttonVariants()} href="/admin/courses/create">Tạo khóa học</Link>
        </div>
        <div>
            <h1>Ở đây bạn sẽ thấy tất cả các khóa học của bạn</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-7">
            {data.map((course)=>(
               <TeacherCourseCard key={course.id} data={course}></TeacherCourseCard>
            ))}
        </div>

        </>
    )
}