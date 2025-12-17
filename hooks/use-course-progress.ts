"use client"

import { CourseSideBarDataType } from "@/app/data/course/get-course-sidebar-data";
import { useMemo } from "react";

interface iAppProps {
  courseData: CourseSideBarDataType["khoaHoc"];
}
interface CourseProgressResult{
    totalLessons: number;
    completedLessons:number;
    progressPercentage:number;
}

export function useCourseProgress({ courseData }: iAppProps) : CourseProgressResult {
  return useMemo(() => {
    let totalLessons = 0;
    let completedLessons = 0;

    courseData.chuongs.forEach((chuong) => {
      chuong.baiHocs.forEach((baiHoc) => {
        totalLessons++;
        // kiểm tra khóa học đã hoàn thành
        const isCompleted = baiHoc.tienTrinhHocs.some(
          (tienTrinh) => tienTrinh.idBaiHoc === baiHoc.id && tienTrinh.hoanThanh
        );
        if (isCompleted) {
          completedLessons++;
        }
      });
    });
    const progressPercentage = totalLessons >0 ? Math.round((completedLessons / totalLessons)* 100):0;
    return {totalLessons,completedLessons,progressPercentage}
  },[courseData]);
}
