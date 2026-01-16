/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { EnrolledCourseType } from "@/app/data/user/get-enrolled-courses";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useConstructUrl } from "@/hooks/use-contruct-url";
import { useCourseProgress } from "@/hooks/use-course-progress";
import Image from "next/image";
import Link from "next/link";
import { ReportCourseButton } from "../[slug]/[lessonId]/_components/ReportCourseButton";

interface iAppProps {
  data: EnrolledCourseType;
}
export function CourseProgressCard({ data }: iAppProps) {
  const thumbnailUrl = useConstructUrl(data.khoaHoc.tepKH);
  const { totalLessons, completedLessons, progressPercentage } = useCourseProgress({
    courseData: data.khoaHoc as any,
  });
  const isArchived = data.khoaHoc.trangThai === "BanLuuTru";
  
  return (
    <Card className="group relative py-0 gap-0">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {isArchived && (
          <Badge variant="secondary" className="rounded bg-amber-100 text-amber-800 border-amber-300">
            Đã lưu trữ
          </Badge>
        )}
        <Badge className="rounded">{data.khoaHoc.capDo}</Badge>
      </div>
      <Image
        width={600}
        height={400}
        className="w-full rounded-t-xl aspect-video h-full object-cover"
        src={thumbnailUrl}
        alt="Ảnh khóa học"
      ></Image>
      <CardContent className="p-4">
        <Link
          className="font-medium text-lg line-clamp-2 hover:underline group-hover:text-primary transition-colors"
          href={`/dashboard/${data.khoaHoc.duongDan}`}
        >
          {data.khoaHoc.tenKhoaHoc}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground leading-tight mt-2">
          {data.khoaHoc.moTaNgan}
        </p>
        <div className="space-y-4 mt-5">
          <div className="flex justify-between mb-1 text-sm">
            <p>Tiến trình học:</p>
            <p className="font-medium">{progressPercentage}%</p>
          </div>
          <Progress value={progressPercentage} className="h-1.5"></Progress>
          <p className="text-xs text-muted-foreground mt-1">
            {completedLessons}/{totalLessons} bài học
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Link
            href={`/dashboard/${data.khoaHoc.duongDan}`}
            className={buttonVariants({
              className: "flex-1",
            })}
          >
            Tiếp tục học
          </Link>
          <ReportCourseButton 
            courseId={data.khoaHoc.id}
            courseName={data.khoaHoc.tenKhoaHoc}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function PublicCourseCardSkeleton() {
  return (
    <Card className="group relative py-0 gap-0">
      <div className="absolute top-2 right-2 z-10 flex items-center">
        <Skeleton className="h-6 w-20 rounded-full"></Skeleton>
      </div>
      <div className="w-full relative h-fit">
        <Skeleton className="w-full rounded-t-xl aspect-video"></Skeleton>
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-full"></Skeleton>
          <Skeleton className="h-6 w-3/4"></Skeleton>
        </div>
        <div className="mt-4 flex items-center gap-x-5">
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md"></Skeleton>
            <Skeleton className="h-4 w-8"></Skeleton>
          </div>
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md"></Skeleton>
            <Skeleton className="h-4 w-8"></Skeleton>
          </div>
        </div>
        <Skeleton className="mt-4 w-full h-10 rounded-md"></Skeleton>
      </CardContent>
    </Card>
  );
}
