import { getChatRoom } from "@/app/actions/chat";
import { ChatContent } from "@/app/components/chat/ChatContent";
import { prisma } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConstructUrl } from "@/hooks/use-contruct-url";

// Use standard params
type Params = Promise<{ courseId: string }>;

export const dynamic = "force-dynamic";

export default async function TeacherChatRoomPage({ params }: { params: Params }) {
  const { courseId } = await params;
  
  // 1. Fetch Room Data
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
        <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
            {res.error ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                    <p>{res.error}</p>
                </div>
            ) : (
                <>
                    {/* Header inside the Chat Frame */}
                    <div className="h-14 border-b flex items-center px-12 md:px-6 justify-between shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex items-center gap-3 group cursor-default overflow-hidden">
                            <Avatar className="h-8 w-8 border ring-2 ring-transparent group-hover:ring-primary/20 transition-all shrink-0 rounded-lg">
                                <AvatarImage src={imageUrl} alt={course?.tenKhoaHoc} className="object-cover" />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold rounded-lg">
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
  );
}
