"use client"

import { CourseSideBarDataType } from "@/app/data/course/get-course-sidebar-data";
import { useMemo } from "react";

interface iAppProps {
  courseData: CourseSideBarDataType["course"];
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

    courseData.chapter.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        totalLessons++;
        // kiểm tra khóa học đã hoàn thành
        const isCompleted = lesson.lessonProgress.some(
          (progress) => progress.lessonId === lesson.id && progress.completed
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
