
import { ReactNode } from "react";
import { CourseSidebar } from "../_components/CourseSidebar";
import { getCourseSideBarData } from "@/app/data/course/get-course-sidebar-data";

interface iAppProps {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}

export default async function CourseLayout({ params, children }: iAppProps) {
  const { slug } = await params;
  const { khoaHoc } = await getCourseSideBarData(slug);
  return (
    <div className="flex flex-1">
      {/* sidebar -30% */}
      <div className="w-80 border-r border-border shrink-0">
        <CourseSidebar course={khoaHoc}></CourseSidebar>
      </div>
      {/* Main content-70% */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}