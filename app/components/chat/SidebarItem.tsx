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
}

export const SidebarItem = ({ course, baseUrl }: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === `${baseUrl}/${course.id}`;
  const imageUrl = useConstructUrl(course.tepKH || "");
  const chatRoomId = course.chatRoomId;

  // Initialize state with the initial last message from DB
  const [lastMessage, setLastMessage] = useState(course.lastMessage);

  // Real-time logic: Subscribe to this specific room's channel
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

  return (
    <Link
      href={`${baseUrl}/${course.id}`}
      className={cn(
        "group relative flex items-center gap-x-3 p-3 rounded-xl transition-all duration-200 ease-in-out border border-transparent",
        "hover:bg-accent/50 hover:shadow-sm hover:-translate-y-0.5",
        isActive 
          ? "bg-background shadow-md border-border ring-1 ring-black/5 dark:ring-white/10" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
        {/* Active Indicator */}
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary" />
        )}

        <Avatar className={cn(
            "h-10 w-10 border transition-transform duration-200 group-hover:scale-105",
            isActive ? "border-primary/20 ring-2 ring-primary/10" : "border-border"
        )}>
            <AvatarImage src={imageUrl} alt={course.tenKhoaHoc} className="object-cover" />
            <AvatarFallback className={cn(
                "text-xs font-semibold",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
                {course.tenKhoaHoc.substring(0,2).toUpperCase()}
            </AvatarFallback>
        </Avatar>

        <div className="flex flex-col flex-1 overflow-hidden gap-0.5">
            <div className="flex justify-between items-baseline">
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <span className={cn(
                        "truncate text-sm font-semibold transition-colors cursor-pointer",
                        isActive ? "text-primary" : "text-foreground"
                     )}>{course.tenKhoaHoc}</span>
                   </TooltipTrigger>
                   <TooltipContent side="right" className="max-w-xs">
                     <p>{course.tenKhoaHoc}</p>
                   </TooltipContent>
                 </Tooltip>
                {lastMessage && (
                  <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
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
    </Link>
  );
};
