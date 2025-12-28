import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Ban, ShieldAlert, User as UserIcon, X, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { toggleChatBan } from "@/app/actions/chat";

interface Member {
  userId: string;
  name: string | null;
  image: string | null;
  email: string | null;
  camChat: boolean;
  isOnline?: boolean;
  role?: string;
}

interface MemberSidebarProps {
  members: Member[];
  currentUserId: string;
  isTeacher: boolean;
  chatRoomId: string;
  onBanToggle: (userId: string, newStatus: boolean) => void;
  onClose?: () => void;
}

export function MemberSidebar({ members, currentUserId, isTeacher, chatRoomId, onBanToggle, onClose }: MemberSidebarProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleBan = async (userId: string, currentStatus: boolean) => {
    setLoadingId(userId);
    try {
        const res = await toggleChatBan(chatRoomId, userId);
        if (res.success) {
            onBanToggle(userId, res.isBanned!);
            toast.success(res.isBanned ? "Đã chặn thành viên" : "Đã bỏ chặn thành viên");
        } else {
            toast.error(res.error || "Lỗi thao tác");
        }
    } catch (error) {
        toast.error("Lỗi kết nối");
    } finally {
        setLoadingId(null);
    }
  };

  const teachers = members.filter(m => m.role === 'TEACHER');
  const onlineStudents = members.filter(m => m.isOnline && m.role !== 'TEACHER');
  const offlineStudents = members.filter(m => !m.isOnline && m.role !== 'TEACHER');

  return (
    <div className="w-64 border-l bg-background h-full flex flex-col">
        <div className="p-4 border-b font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
                <UserIcon className="size-4" />
                Thành viên ({members.length})
            </div>
            {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden -mr-2 text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                </Button>
            )}
        </div>
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
                 {/* Teacher Group */}
                {teachers.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-primary uppercase flex items-center gap-1">
                            <GraduationCap className="size-3" />
                            Giảng viên
                        </p>
                        {teachers.map(member => (
                            <MemberItem 
                                key={member.userId} 
                                member={member} 
                                isTeacher={isTeacher} 
                                currentUserId={currentUserId}
                                onBan={() => {}} // Teachers cannot be banned
                                loading={false}
                            />
                        ))}
                    </div>
                )}

                {/* Online Group */}
                {onlineStudents.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Online — {onlineStudents.length}</p>
                        {onlineStudents.map(member => (
                            <MemberItem 
                                key={member.userId} 
                                member={member} 
                                isTeacher={isTeacher} 
                                currentUserId={currentUserId}
                                onBan={() => handleBan(member.userId, member.camChat)}
                                loading={loadingId === member.userId}
                            />
                        ))}
                    </div>
                )}

                {/* Offline Group */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Offline — {offlineStudents.length}</p>
                    {offlineStudents.map(member => (
                        <MemberItem 
                            key={member.userId} 
                            member={member} 
                            isTeacher={isTeacher}
                            currentUserId={currentUserId}
                            onBan={() => handleBan(member.userId, member.camChat)}
                            loading={loadingId === member.userId}
                        />
                    ))}
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}

function MemberItem({ member, isTeacher, currentUserId, onBan, loading }: { 
    member: Member, isTeacher: boolean, currentUserId: string, onBan: () => void, loading: boolean 
}) {
    const isMe = member.userId === currentUserId;
    const isTargetTeacher = member.role === 'TEACHER';

    return (
        <div className="flex items-center gap-2 group">
            <div className="relative">
                <Avatar className="size-8">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback>{member.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                {member.isOnline ? (
                    <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-background rounded-full"></span>
                ) : isTargetTeacher ? (
                     <span className="absolute bottom-0 right-0 size-2.5 bg-zinc-400 border-2 border-background rounded-full"></span>
                ) : null}
            </div>
            
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate flex items-center gap-1 ${member.camChat ? "text-muted-foreground line-through" : ""}`}>
                    {member.name}
                    {isTargetTeacher && <GraduationCap className="size-3 text-primary" />}
                </p>
                {member.camChat && <p className="text-[10px] text-destructive">Đã bị chặn</p>}
                {isTargetTeacher && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-primary">Giảng viên</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className={`text-[10px] ${member.isOnline ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            {member.isOnline ? "Online" : "Offline"}
                        </span>
                    </div>
                )}
            </div>

            {/* Teacher Actions - Only allow banning Students */}
            {isTeacher && !isMe && !isTargetTeacher && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`size-6 opacity-0 group-hover:opacity-100 transition-opacity ${member.camChat ? "text-destructive opacity-100" : "text-muted-foreground"}`}
                                onClick={onBan}
                                disabled={loading}
                            >
                                {member.camChat ? <ShieldAlert className="size-3" /> : <Ban className="size-3" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {member.camChat ? "Bỏ chặn" : "Chặn chat"}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}
