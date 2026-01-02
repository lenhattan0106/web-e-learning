"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, ImageIcon, FileText } from "lucide-react";
import Pusher from "pusher-js";
import { env } from "@/lib/env";
import { formatMessageTime } from "@/lib/format";
import { useConstructUrl } from "@/hooks/use-contruct-url";

interface SidebarItemProps {
  course: any;
  baseUrl: string;
  isCollapsed?: boolean;
}

export const SidebarItem = ({ course, baseUrl, isCollapsed }: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === `${baseUrl}/${course.id}`;
  const imageUrl = useConstructUrl(course.tepKH || "");
  const chatRoomId = course.chatRoomId;

  // ... (keep state and effect)

  const [lastMessage, setLastMessage] = useState(course.lastMessage);

  useEffect(() => {
    if (!chatRoomId) return;

    const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: 'ap1'
    });
    
    const channel = pusher.subscribe('nt-elearning');
    channel.bind('event', (data: any) => {
        if (data.phongChatId === chatRoomId) {
            setLastMessage(data);
        }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [chatRoomId]);

  const getPreviewText = () => {
    if (!lastMessage) return "Nhấn để thảo luận";
    if (lastMessage.fileUrl && lastMessage.fileType === "IMAGE") {
      return <span className="flex items-center gap-1"><ImageIcon className="size-3"/> Hình ảnh</span>;
    }
    if (lastMessage.fileUrl) {
      return <span className="flex items-center gap-1"><FileText className="size-3"/> Tệp tin</span>;
    }
    return <span className="truncate">{lastMessage.noiDung}</span>;
  };

  const content = (
    <Link
      href={`${baseUrl}/${course.id}`}
      className={cn(
        "group relative flex items-center p-2.5 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border border-transparent min-h-[60px]",
        isCollapsed ? "justify-center" : "justify-start",
        "hover:bg-accent/50 hover:shadow-sm hover:-translate-y-0.5",
        isActive 
          ? "bg-background shadow-md border-border ring-1 ring-black/5 dark:ring-white/10" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
        {/* Active Indicator */}
        {isActive && (
            <div className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
              isCollapsed ? "h-1.5 w-1.5 left-1/2 -translate-x-1/2 top-auto bottom-1 translate-y-0 rounded-full" : "h-8 w-1"
            )} />
        )}

        {/* Thumbnail Image - Landscape 16:9 (Standard for Courses) */}
        <div className={cn(
            "relative shrink-0 overflow-hidden rounded-md border shadow-sm transition-all duration-300 bg-gradient-to-br from-muted to-muted/50",
             "w-16 h-9",
             isActive ? "border-primary/20 ring-2 ring-primary/10" : "border-border"
        )}>
            <img 
              src={imageUrl} 
              alt={course.tenKhoaHoc} 
              className="h-full w-full object-contain"
            />
             <div className="absolute inset-0 bg-black/5 dark:bg-white/5 pointer-events-none" />
        </div>

        {/* Text Content with Smooth Reveal */}
        <div className={cn(
          "flex-1 overflow-hidden transition-all duration-300 ease-out whitespace-nowrap",
          isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 ml-3"
        )}>
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-baseline gap-2">
                    {/* Inner tooltip only renders when not collapsed, and since outer tooltip is conditional, no nesting occurs */}
                    {!isCollapsed ? (
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <span className={cn(
                                "truncate text-sm font-semibold transition-colors flex-1 cursor-default",
                                isActive ? "text-primary" : "text-foreground"
                            )}>
                            {course.tenKhoaHoc}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <p>{course.tenKhoaHoc}</p>
                        </TooltipContent>
                        </Tooltip>
                    ) : (
                        <span className={cn(
                            "truncate text-sm font-semibold transition-colors flex-1 cursor-default",
                            isActive ? "text-primary" : "text-foreground"
                        )}>
                            {course.tenKhoaHoc}
                        </span>
                    )}
                    {lastMessage && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatMessageTime(lastMessage.createdAt)}
                      </span>
                    )}
                </div>
                
                <div className={cn(
                    "text-[11px] truncate flex items-center gap-1",
                    isActive ? "text-foreground/80 font-medium" : "text-muted-foreground",
                    !lastMessage && "italic opacity-80"
                )}>
                    {getPreviewText()}
                </div>
              </div>
        </div>
    </Link>
  );

  if (isCollapsed) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {content}
            </TooltipTrigger>
            <TooltipContent side="right">
                <p>{course.tenKhoaHoc}</p>
            </TooltipContent>
        </Tooltip>
    );
  }

  return content;
};




