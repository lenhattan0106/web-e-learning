import { getMyCourses } from "@/app/actions/get-my-courses";
import { SidebarChat } from "@/app/components/chat/SidebarChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";

export default async function StudentChatPage() {
  const courses = await getMyCourses();

  return (
    <div className="flex h-[calc(100vh-120px)] border rounded-xl overflow-hidden bg-background shadow-sm ring-1 ring-border/50">
      {/* Sidebar List */}
      <div className="w-80 border-r flex flex-col bg-muted/30 backdrop-blur-sm">
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
          <SidebarChat courses={courses} baseUrl="/dashboard/chat" />
        </ScrollArea>
      </div>

      {/* Main Welcome Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-white/50">
        <div className="bg-muted p-6 rounded-full mb-4 opacity-50 ring-1 ring-border/50">
             <MessageSquare className="size-12 text-primary/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Thảo luận chung</h3>
        <p className="max-w-xs mx-auto text-sm">Chọn một lớp học để bắt đầu trao đổi với giảng viên và các bạn học khác.</p>
      </div>
    </div>
  );
}
