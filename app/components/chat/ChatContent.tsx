"use client";

import { useState, useEffect, useRef } from "react";
import { getMessages, sendMessage, deleteMessage, editMessage, getChatMembers } from "@/app/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Paperclip, Image as ImageIcon, X, FileIcon, Download, MoreVertical, Trash, Pencil, Check, FileAudio, FileVideo, FileCode, FileSpreadsheet, FileType, FileText, FileArchive, Play, ShieldAlert, Users, PanelRightClose, PanelRightOpen } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Pusher from "pusher-js";
import { env } from "@/lib/env";
import { formatMessageTime } from "@/lib/format";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberSidebar } from "./MemberSidebar";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  noiDung: string;
  createdAt: Date;
  userId: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  isDeleted?: boolean;
  loaiTinNhan?: "USER" | "SYSTEM";
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ChatContentProps {
  chatRoomId: string;
  currentUserId: string;
}

const getFileIcon = (fileType: string | undefined | null, fileName: string | undefined | null) => {
  if (!fileType) return <FileIcon className="size-5" />;
  if (fileType.startsWith("image/")) return <ImageIcon className="size-5 text-purple-500" />;
  if (fileType.startsWith("video/")) return <FileVideo className="size-5 text-red-500" />;
  if (fileType.startsWith("audio/")) return <FileAudio className="size-5 text-yellow-500" />;
  if (fileType.includes("pdf")) return <FileType className="size-5 text-red-600" />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className="size-5 text-blue-600" />;
  if (fileType.includes("excel") || fileType.includes("spreadsheet") || fileType.includes("csv")) return <FileSpreadsheet className="size-5 text-green-600" />;
  if (fileType.includes("zip") || fileType.includes("compressed") || fileType.includes("7z")) return <FileArchive className="size-5 text-orange-600" />;
  if (fileType.includes("json") || fileType.includes("javascript") || fileType.includes("html") || fileType.includes("xml")) return <FileCode className="size-5 text-slate-600" />;
  return <FileIcon className="size-5" />;
};

const MediaRenderer = ({ url, type, name }: { url: string; type: string | undefined | null; name: string | undefined | null }) => {
    if (!type) return null;
    if (type.startsWith("video/")) {
        return (
            <div className="relative w-full max-w-sm">
                <video controls className="rounded-md w-full max-h-[300px] bg-black">
                    <source src={url} type={type} />
                   Trình duyệt của bạn không hỗ trợ video tag.
                </video>
            </div>
        );
    }
    if (type.startsWith("audio/")) {
        return (
            <div className="w-full max-w-[250px] bg-background/50 p-2 rounded-md flex items-center gap-2">
                <audio controls className="w-full h-8">
                    <source src={url} type={type} />
                     Trình duyệt của bạn không hỗ trợ audio tag.
                </audio>
            </div>
        );
    }
    if (type.startsWith("image/")) {
        return (
             <div className="relative group/image">
                <div className="relative w-full max-w-sm aspect-video sm:w-48 sm:h-auto">
                    <img src={url} alt="Attached Image" className="object-cover rounded-md w-full h-auto max-h-[300px]" referrerPolicy="no-referrer" />
                </div>
                <Link href={url} target="_blank" className="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-black/70" title="Tải xuống">
                    <Download className="size-4" />
                </Link>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 p-3 bg-background/20 rounded border border-white/20 hover:bg-background/30 transition-colors group/file">
            <div className="bg-white/20 p-2 rounded shadow-sm">{getFileIcon(type, name)}</div>
            <div className="flex-1 min-w-0 max-w-[150px]">
                <p className="font-medium truncate text-xs" title={name || "File"}>{name || "Tệp đính kèm"}</p>
                <p className="text-[10px] opacity-70 uppercase truncate">{type.split("/")[1]?.substring(0, 10).toUpperCase() || "FILE"}</p>
            </div>
            <Link href={url} target="_blank" className="p-1 hover:bg-white/10 rounded text-foreground/80 hover:text-foreground">
                <Download className="size-4" />
            </Link>
        </div>
    );
};

export function ChatContent({ chatRoomId, currentUserId }: ChatContentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Member & Presence State
  const [members, setMembers] = useState<any[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [activeMemberIds, setActiveMemberIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    if (!loadingMore) {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }
  };

  useEffect(() => {
    if (!loadingMore) scrollToBottom();
  }, [messages, loadingMore]);

  useEffect(() => {
    const initChat = async () => {
      try {
        const resMsgs = await getMessages(chatRoomId);
        if (resMsgs.messages) {
           setMessages(resMsgs.messages as any);
           if (resMsgs.messages.length < 50) setHasMore(false);
        }
        
        const resMembers = await getChatMembers(chatRoomId);
        if (resMembers.success && resMembers.members) {
            setMembers(resMembers.members);
            setIsTeacher(!!resMembers.isTeacher);
        }
      } catch (error) {
        toast.error("Không thể tải dữ liệu chat");
      } finally {
        setLoading(false);
      }
    };

    initChat();

    pusherRef.current = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
       cluster: 'ap1',
       authEndpoint: '/api/pusher/auth',
    });

    const eventChannel = pusherRef.current.subscribe('nt-elearning');
    eventChannel.bind('event', (data: any) => {
        setMessages((current) => {
            if (current.some(msg => msg.id === data.id)) return current;
            return [...current, data];
        });
    });
    eventChannel.bind('message-deleted', (data: { id: string }) => {
        setMessages((current) => current.filter(msg => msg.id !== data.id));
    });
    eventChannel.bind('message-updated', (data: Message) => {
        setMessages((current) => current.map(msg => msg.id === data.id ? data : msg));
    });

    // Listen for member status updates (Bans)
    eventChannel.bind('member-updated', (data: { userId: string, camChat: boolean }) => {
        setMembers(prev => prev.map(m => m.userId === data.userId ? { ...m, camChat: data.camChat } : m));
        if (data.userId === currentUserId && data.camChat) {
             toast.error("Bạn đã bị hạn chế quyền thảo luận.");
        } else if (data.userId === currentUserId && !data.camChat) {
             toast.info("Quyền thảo luận của bạn đã được khôi phục.");
        }
    });

    const presenceChannel = pusherRef.current.subscribe('presence-nt-elearning');
    channelRef.current = presenceChannel;

    presenceChannel.bind('pusher:subscription_succeeded', (membersData: any) => {
        const activeDefaults = new Set<string>();
        membersData.each((member: any) => activeDefaults.add(member.id));
        setActiveMemberIds(activeDefaults);
    });
    presenceChannel.bind('pusher:member_added', (member: any) => setActiveMemberIds(prev => new Set(prev).add(member.id)));
    presenceChannel.bind('pusher:member_removed', (member: any) => setActiveMemberIds(prev => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
    }));
    presenceChannel.bind('client-typing', (data: { userId: string, isTyping: boolean }) => {
        if (data.userId === currentUserId) return;
        setTypingUsers(prev => {
            const next = new Set(prev);
            if (data.isTyping) next.add(data.userId);
            else next.delete(data.userId);
            return next;
        });
    });

    return () => {
      pusherRef.current?.unsubscribe('nt-elearning');
      pusherRef.current?.unsubscribe('presence-nt-elearning');
      pusherRef.current?.disconnect();
    };
  }, [chatRoomId, currentUserId]);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const firstMessageId = messages[0].id;
    const viewport = scrollViewportRef.current;
    const oldScrollHeight = viewport ? viewport.scrollHeight : 0;
    const oldScrollTop = viewport ? viewport.scrollTop : 0;

    try {
        const res = await getMessages(chatRoomId, firstMessageId);
        if (res.messages && res.messages.length > 0) {
            setMessages((prev) => [...(res.messages as any), ...prev]);
            requestAnimationFrame(() => {
                if (viewport) {
                    const newScrollHeight = viewport.scrollHeight;
                    viewport.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
                }
            });
            if (res.messages.length < 50) setHasMore(false);
        } else {
            setHasMore(false);
        }
    } catch (error) {
        toast.error("Lỗi tải tin nhắn cũ");
    } finally {
        setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore) loadMoreMessages();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedFile) || isSending || isUploading) return;
    setIsSending(true);
    const tempId = Math.random().toString();
    const textToSend = inputText;
    
    setMessages((prev) => [...prev, {
      id: tempId,
      noiDung: textToSend,
      createdAt: new Date(),
      userId: currentUserId,
      fileUrl: previewUrl,
      fileType: selectedFile?.type,
      fileName: selectedFile?.name,
      loaiTinNhan: "USER",
      user: { id: currentUserId, name: "Me", image: null },
    }]);
    setInputText("");
    const fileToUpload = selectedFile;
    clearFile();
    
    // Stop typing indicator immediately
    if (channelRef.current) channelRef.current.trigger('client-typing', { userId: currentUserId, isTyping: false });

    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    let uploadedFileUrl = null;
    let uploadedFileType = null;
    let uploadedFileName = null;

    try {
        if (fileToUpload) {
            setIsUploading(true);
            const uploadRes = await fetch("/api/messages/upload", {
                method: "POST",
                body: JSON.stringify({ fileName: fileToUpload.name, contentType: fileToUpload.type, size: fileToUpload.size })
            });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const { presignedUrl, fileUrl, fileName } = await uploadRes.json();
            await fetch(presignedUrl, { method: "PUT", body: fileToUpload, headers: { "Content-Type": fileToUpload.type } });
            uploadedFileUrl = fileUrl;
            uploadedFileType = fileToUpload.type;
            uploadedFileName = fileName;
            setIsUploading(false);
        }

        const res = await sendMessage(chatRoomId, textToSend, uploadedFileUrl, uploadedFileType, uploadedFileName);
        if (!res.message) {
             toast.error("Gửi thất bại");
             setMessages((prev) => prev.filter((m) => m.id !== tempId));
             setInputText(textToSend);
        } else {
             const realMsg = res.message as Message;
             setMessages(prev => {
                const alreadyExists = prev.some(m => m.id === realMsg.id);
                if (alreadyExists) return prev.filter((m) => m.id !== tempId);
                return prev.map((m) => (m.id === tempId ? realMsg : m));
             });
        }
    } catch (error) {
        toast.error("Có lỗi xảy ra");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputText(textToSend); 
        setIsUploading(false);
    } finally {
        setIsSending(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      if (channelRef.current) {
          channelRef.current.trigger('client-typing', { userId: currentUserId, isTyping: true });
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
               if (channelRef.current) channelRef.current.trigger('client-typing', { userId: currentUserId, isTyping: false });
          }, 2000);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const handleDelete = async (mid: string) => { 
     const prevMsgs = [...messages];
     setMessages(prev => prev.filter(m => m.id !== mid));
     const res = await deleteMessage(mid);
     if(res.error) { setMessages(prevMsgs); toast.error(res.error); }
  };
  const startEditing = (msg: Message) => { setEditingMessageId(msg.id); setEditContent(msg.noiDung); };
  const cancelEditing = () => { setEditingMessageId(null); setEditContent(""); };
  const saveEdit = async (mid: string) => {
      if(!editContent.trim()) return;
      const prevMsgs = [...messages];
      setMessages(prev => prev.map(m => m.id === mid ? { ...m, noiDung: editContent } : m));
      cancelEditing();
      const res = await editMessage(mid, editContent);
      if(res.error) { setMessages(prevMsgs); toast.error(res.error); }
  };

  const handleBanToggle = (userId: string, status: boolean) => {
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, camChat: status } : m));
  };
  
  const isUserBanned = members.find(m => m.userId === currentUserId)?.camChat;
  const renderedMembers = members.map(m => ({ ...m, isOnline: activeMemberIds.has(m.userId) })).sort((a,b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1));

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex h-full overflow-hidden relative">
        <div className="flex flex-col flex-1 bg-background relative min-w-0">
             {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur shrink-0 z-10 w-full">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">Thảo luận chung</h3>
                    {typingUsers.size > 0 && <span className="text-xs text-muted-foreground animate-pulse italic">typing...</span>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn("text-muted-foreground", isSidebarOpen && "bg-muted text-foreground")}>
                    {isSidebarOpen ? <PanelRightClose className="size-5" /> : <PanelRightOpen className="size-5" />}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/5 scroll-smooth" onScroll={handleScroll} ref={scrollViewportRef}>
                {loadingMore && <div className="flex justify-center py-2"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}
                
                {messages.map((msg) => {
                    if (msg.loaiTinNhan === 'SYSTEM') {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full text-center max-w-[80%]">{msg.noiDung}</span>
                            </div>
                        );
                    }
                    const isMe = msg.userId === currentUserId;
                    const isEditing = editingMessageId === msg.id;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 group ${isMe ? "flex-row-reverse" : ""}`}>
                            <Avatar className="size-8 shrink-0">
                                <AvatarImage src={msg.user.image || undefined} />
                                <AvatarFallback>{msg.user.name?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                            <div className={`max-w-[75%] relative`}>
                                <div className={`px-4 py-2 text-sm shadow-sm rounded-2xl ${isMe ? "bg-primary text-primary-foreground" : "bg-card border text-card-foreground"}`}>
                                    {msg.fileUrl && <div className="mb-2 rounded overflow-hidden"><MediaRenderer url={msg.fileUrl} type={msg.fileType} name={msg.fileName} /></div>}
                                    {!isMe && <p className="text-[10px] font-bold opacity-70 mb-0.5">{msg.user.name}</p>}
                                    {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                            <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="h-9 text-sm bg-background text-foreground" autoFocus />
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 text-destructive" onClick={cancelEditing}><X className="size-4" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-green-100 text-green-600" onClick={() => saveEdit(msg.id)}><Check className="size-4" /></Button>
                                            </div>
                                        </div>
                                    ) : ( msg.noiDung && <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.noiDung}</p> )}
                                    <div className={`text-[9px] mt-1 flex justify-end opacity-70 ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{formatMessageTime(msg.createdAt)}</div>
                                </div>
                                {isMe && !msg.id.includes("0.") && (
                                    <div className="absolute top-0 -left-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground/50 hover:text-foreground"><MoreVertical className="size-3" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {!msg.fileUrl && <DropdownMenuItem onClick={() => startEditing(msg)}><Pencil className="mr-2 size-3 text-blue-500" /><span>Chỉnh sửa</span></DropdownMenuItem>}
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(msg.id)}><Trash className="mr-2 size-3" /><span>Xóa</span></DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>
            
            {/* Thread Typing */}
            {/* Moved to Header */}
            
            <div className="p-4 bg-background border-t">
                {isUserBanned ? (
                    <div className="flex items-center justify-center p-3 bg-destructive/10 text-destructive rounded-md gap-2">
                        <ShieldAlert className="size-4" />
                        <span className="text-sm font-medium">Bạn đã bị hạn chế quyền thảo luận trong phòng này.</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                         {selectedFile && (
                            <div className="relative inline-flex items-center gap-3 p-2 border rounded-lg bg-muted pr-8 max-w-full">
                                {selectedFile.type.startsWith("image/") && previewUrl ? <img src={previewUrl} className="h-10 w-10 object-cover rounded" /> : <FileIcon className="size-8 text-muted-foreground" />}
                                <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{selectedFile.name}</p><p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p></div>
                                <button onClick={clearFile} className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-1 hover:opacity-80"><X className="size-3" /></button>
                            </div>
                        )}
                        <div className="flex gap-2 items-end">
                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0"><Paperclip className="size-5 text-muted-foreground" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0"><ImageIcon className="size-5 text-muted-foreground" /></Button>
                            <Input value={inputText} onChange={handleTyping} onKeyDown={handleKeyDown} placeholder="Nhập tin nhắn..." className="flex-1" disabled={isSending || isUploading} />
                            <Button onClick={handleSend} disabled={(!inputText.trim() && !selectedFile) || isSending || isUploading} className="shrink-0">
                                {isSending ? <Loader2 className="animate-spin size-5" /> : <Send className="size-5" />}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {isSidebarOpen && (
            <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {isSidebarOpen && (
            <div className={cn(
                "h-full animate-in slide-in-from-right-10 duration-200 shrink-0 overflow-hidden",
                "absolute inset-y-0 right-0 z-40 shadow-2xl md:static md:shadow-none bg-background"
            )}>
                <MemberSidebar members={renderedMembers} isTeacher={isTeacher} currentUserId={currentUserId} chatRoomId={chatRoomId} onBanToggle={handleBanToggle} onClose={() => setIsSidebarOpen(false)} />
            </div>
        )}
        {/* Mobile Sidebar overlay? */}
    </div>
  );
}
