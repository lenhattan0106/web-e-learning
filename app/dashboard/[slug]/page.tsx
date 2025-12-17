import { getCourseSideBarData } from "@/app/data/course/get-course-sidebar-data";
import { redirect } from "next/navigation";

interface iAppProps {
    params: Promise<{slug: string}>;
}

export default async function CourseSlugRoute({params}:iAppProps){
    const  {slug} = await params;
    const {khoaHoc}  = await  getCourseSideBarData(slug);
    
    const firstChuong = khoaHoc.chuongs[0];
    const firstBaiHoc = firstChuong.baiHocs[0];
    if(firstBaiHoc){
        redirect(`/dashboard/${slug}/${firstBaiHoc.id}`);
    }
    return(
        <div className="flex items-center justify-center h-full text-center">
            <h2 className="text-xl font-bold mb-2">Bài học chưa có sẵn</h2>
            <p>Khóa học của bạn chưa có bất kì bài học nào </p>
        </div>
    )
}