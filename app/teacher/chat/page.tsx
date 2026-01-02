import { MessageSquare } from "lucide-react";

export default function TeacherChatPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-white/50 h-full">
        <div className="bg-muted p-6 rounded-full mb-4 opacity-50 ring-1 ring-border/50">
            <MessageSquare className="size-12 text-primary/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Trung tâm tin nhắn</h3>
        <p className="max-w-xs mx-auto text-sm">Chọn một lớp học từ danh sách bên trái để xem thảo luận và hỗ trợ học viên.</p>
    </div>
  );
}
