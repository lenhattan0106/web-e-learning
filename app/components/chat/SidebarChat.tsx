"use client";

import { SidebarItem } from "./SidebarItem";
import { TooltipProvider } from "@/components/ui/tooltip";

export const SidebarChat = ({ courses, baseUrl = "/chat" }: { courses: any[], baseUrl?: string }) => {
  return (
    <TooltipProvider delayDuration={0}>
        <div className="flex flex-col gap-2 p-3">
        {courses.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4 animate-in fade-in slide-in-from-top-4">
                Bạn chưa tham gia khóa học nào.
            </div>
        )}
        {courses.map((course) => (
            <SidebarItem key={course.id} course={course} baseUrl={baseUrl} />
        ))}
        </div>
    </TooltipProvider>
  );
};
