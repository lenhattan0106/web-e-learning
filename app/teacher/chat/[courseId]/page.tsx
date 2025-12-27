import { getChatRoom } from "@/app/actions/chat";
import { getMyCourses } from "@/app/actions/get-my-courses";
import { ChatContent } from "@/app/components/chat/ChatContent";
import { SidebarChat } from "@/app/components/chat/SidebarChat";
import { MobileChatSidebar } from "@/app/components/chat/MobileChatSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConstructUrl } from "@/hooks/use-contruct-url";

// Use standard params
type Params = Promise<{ courseId: string }>;

export const dynamic = "force-dynamic";

export default async function TeacherChatRoomPage({ params }: { params: Params }) {
  const { courseId } = await params;
  
  // 1. Fetch Lists (for Sidebar persistence)
  const courses = await getMyCourses();

  // 2. Fetch Room Data
  const res = await getChatRoom(courseId);
  const course = await prisma.khoaHoc.findUnique({
      where: { id: courseId },
      select: { 
          tenKhoaHoc: true,
          tepKH: true
      }
  });

  // Construct URL safely
  const imageUrl = useConstructUrl(course?.tepKH || "");

  return (
    <div className="flex h-[calc(100dvh-100px)] md:h-[calc(100dvh-120px)] border rounded-xl overflow-hidden bg-background shadow-sm ring-1 ring-border/50">
      {/* Sidebar List (Persistent) */}
      <div className="w-80 border-r flex flex-col bg-muted/30 hidden md:flex backdrop-blur-sm">
        <div className="h-14 border-b px-4 flex items-center justify-between shrink-0 bg-background/50">
            <div className="flex items-center gap-2 font-semibold text-sm">
                <MessageSquare className="size-4 text-primary" />
                <span>Danh sách lớp học</span>
            </div>
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border font-mono">
                {courses.length}
            </span>
        </div>
        <ScrollArea className="flex-1 p-2">
          <SidebarChat courses={courses} baseUrl="/teacher/chat" />
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
          {res.error ? (
               <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                  <p>{res.error}</p>
              </div>
          ) : (
             <>
                {/* Header inside the Chat Frame */}
                <div className="h-14 border-b flex items-center px-4 md:px-6 justify-between shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3 group cursor-default overflow-hidden">
                        {/* Mobile Menu Trigger */}
                        <MobileChatSidebar courses={courses} />

                        <Avatar className="h-8 w-8 border ring-2 ring-transparent group-hover:ring-primary/20 transition-all shrink-0">
                             <AvatarImage src={imageUrl} alt={course?.tenKhoaHoc} className="object-cover" />
                             <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {course?.tenKhoaHoc?.charAt(0)}
                             </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-sm truncate flex items-center gap-2">
                                {course?.tenKhoaHoc}
                            </h2>
                             <p className="text-[10px] text-muted-foreground font-light flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Đang hoạt động
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden bg-muted/5">
                    <ChatContent 
                        chatRoomId={res.chatRoomId!} 
                        currentUserId={res.currentUserId!} 
                    />
                </div>
             </>
          )}
      </div>
    </div>
  );
}
