"use client";

import { SidebarItem } from "./SidebarItem";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


export const SidebarChat = ({ courses, baseUrl = "/chat", isCollapsed }: { courses: any[], baseUrl?: string, isCollapsed?: boolean }) => {
  return (
    <TooltipProvider delayDuration={0}>
        <div className={cn("flex flex-col gap-2 p-3", isCollapsed && "items-center px-2")}>
        {courses.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4 animate-in fade-in slide-in-from-top-4">
                {isCollapsed ? "Trống" : "Bạn chưa tham gia khóa học nào."}
            </div>
        )}
        {courses.map((course) => (
            <SidebarItem key={course.id} course={course} baseUrl={baseUrl} isCollapsed={isCollapsed} />
        ))}
        </div>
    </TooltipProvider>
  );
};

