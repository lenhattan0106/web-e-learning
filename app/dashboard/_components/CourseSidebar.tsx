"use client";

import { CourseSideBarDataType } from "@/app/data/course/get-course-sidebar-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Archive, ArrowLeft, ChevronDown, Play, MessageSquare } from "lucide-react";
import { LessonItem } from "./LessonItem";
import { usePathname, useRouter } from "next/navigation";
import { useCourseProgress } from "@/hooks/use-course-progress";
import Link from "next/link";

interface iAppProps {
  course: CourseSideBarDataType["khoaHoc"];
}

export function CourseSidebar({ course }: iAppProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentLessonId = pathname.split("/").pop();
  const { completedLessons, progressPercentage, totalLessons } = useCourseProgress({ courseData: course });

  // Check if chat enabled (schema-wise)
  const hasChat = !!course.phongChat;
  const isArchived = course.trangThai === "BanLuuTru";

  return (
    <div className="flex flex-col h-full">
      {/* Nút quay lại */}
      <div className="pb-3 pr-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại</span>
        </Button>
      </div>

      {/* Thông báo khóa học đã lưu trữ */}
      {isArchived && (
        <div className="pr-4 py-3 border-b border-border">
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 py-2">
            <Archive className="size-3 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
              Khóa học đã ngừng kinh doanh nhưng bạn vẫn có quyền truy cập.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="pb-4 pr-4 border-b border-border pt-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Play className="size-5 text-primary"></Play>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base leading-tight truncate">{course.tenKhoaHoc}</h1>
            <p className="text-xs text-muted-foreground mt-1 truncate">{course.danhMuc}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Tiến trình</span>
            <span className="font-medium">
              {completedLessons}/{totalLessons}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-1.5"></Progress>
          <p className="text-xs text-muted-foreground">{progressPercentage}% hoàn thành</p>
        </div>
        

      </div>
      
      {/* Lessons List - No Tabs anymore */}
      <div className="py-4 pr-4 space-y-3 overflow-y-auto flex-1">
            {course.chuongs.map((chuong, index) => (
              <Collapsible key={chuong.id} defaultOpen={index === 0}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full p-3 h-auto flex items-center gap-2">
                    <div className="shrink-0">
                      <ChevronDown className="size-4 text-primary"></ChevronDown>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-sm truncate text-foreground">
                        {chuong.thuTu}: {chuong.tenChuong}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium truncate">
                        {chuong.baiHocs.length} bài học
                      </p>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 pl-6 border-l-2 space-y-3">
                  {chuong.baiHocs.map((baiHoc) => (
                    <LessonItem
                      completed={
                        baiHoc.tienTrinhHocs.find((tienTrinh) => tienTrinh.idBaiHoc === baiHoc.id)
                          ?.hoanThanh || false
                      }
                      key={baiHoc.id}
                      lesson={baiHoc}
                      slug={course.duongDan}
                      isActive={currentLessonId === baiHoc.id}
                    ></LessonItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

    </div>
  );
}