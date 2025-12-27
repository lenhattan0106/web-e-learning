"use client";

import { useState, useEffect, useRef } from "react";
import { getMessages, sendMessage } from "@/app/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Paperclip, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Pusher from "pusher-js";
import { env } from "@/lib/env";
import { formatMessageTime } from "@/lib/format";

interface Message {
  id: string;
  noiDung: string;
  createdAt: Date;
  userId: string;
  fileUrl?: string | null;
  fileType?: string | null;
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

export function ChatContent({ chatRoomId, currentUserId }: ChatContentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Only scroll to bottom if we are not loading more (i.e., this is a new message or initial load)
    if (!loadingMore) {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }
  };

  useEffect(() => {
    // Only auto-scroll to bottom if we are genuinely adding new messages at the end, not prepending older ones
    if (!loadingMore) {
        scrollToBottom();
    }
  }, [messages, loadingMore]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await getMessages(chatRoomId);
        if (res.messages) {
          setMessages(res.messages as any);
          if (res.messages.length < 50) setHasMore(false);
        }
      } catch (error) {
        toast.error("Không thể tải tin nhắn");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Initialize Pusher
    const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: 'ap1'
    });

    const channel = pusher.subscribe('nt-elearning');

    channel.bind('event', (data: any) => {
        setMessages((current) => {
            if (current.some(msg => msg.id === data.id)) {
                return current;
            }
            return [...current, data];
        });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [chatRoomId]);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    
    setLoadingMore(true);
    const firstMessageId = messages[0].id;
    
    // Capture usage scroll position
    const viewport = scrollViewportRef.current;
    const oldScrollHeight = viewport ? viewport.scrollHeight : 0;
    const oldScrollTop = viewport ? viewport.scrollTop : 0;

    try {
        const res = await getMessages(chatRoomId, firstMessageId);
        if (res.messages && res.messages.length > 0) {
            setMessages((prev) => [...(res.messages as any), ...prev]);
            
            // Restore scroll position
            // We need to wait for DOM to update. RequestAnimationFrame or setTimeout helps.
            requestAnimationFrame(() => {
                if (viewport) {
                    const newScrollHeight = viewport.scrollHeight;
                    // The new content height is (newScrollHeight - oldScrollHeight)
                    // We want to stay at the same relative checking point
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
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop === 0 && hasMore) {
        loadMoreMessages();
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    setIsSending(true);

    const tempId = Math.random().toString();
    const optimisticMsg: Message = {
      id: tempId,
      noiDung: inputText,
      createdAt: new Date(),
      userId: currentUserId,
      user: { id: currentUserId, name: "Me", image: null },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    const textToSend = inputText;
    setInputText("");
    // For new messages, we DO want to scroll to bottom
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const res = await sendMessage(chatRoomId, textToSend);
    if (!res.message) {
      // Revert if failed
      toast.error("Gửi thất bại");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(textToSend);
    } else {
      // Replace optimistic or deduplicate
      const realMsg = res.message as Message; // Ensure type
      setMessages((prev) => {
        // Did Pusher already insert the real message?
        const alreadyExists = prev.some(m => m.id === realMsg.id);
        if (alreadyExists) {
            // If so, just remove the temporary one
            return prev.filter(m => m.id !== tempId);
        }
        // Otherwise, replace the temporary one with the real one
        return prev.map((m) => (m.id === tempId ? realMsg : m));
      });
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  }

  if (loading) {
     return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
        {/* Messages Area */}
        {/* Messages Area - Using native scroll for better mobile reliability */}
        <div 
            className="flex-1 overflow-y-auto p-4 bg-muted/5 scroll-smooth" 
            onScroll={handleScroll} 
            ref={scrollViewportRef}
        >
            <div className="flex flex-col gap-4 min-h-full justify-end">
                 {loadingMore && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện ngay!
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.userId === currentUserId;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                            <Avatar className="size-8 shrink-0">
                                <AvatarImage src={msg.user.image || undefined} />
                                <AvatarFallback>{msg.user.name?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                isMe ? "bg-primary text-primary-foreground" : "bg-card border text-card-foreground"
                            }`}>
                                {/* File Display Logic (Placeholder) */}
                                {msg.fileUrl && (
                                    <div className="mb-2 rounded overflow-hidden">
                                        {msg.fileType === "IMAGE" ? (
                                            <div className="relative w-48 h-32">
                                                <Image src={msg.fileUrl} alt="Image" fill className="object-cover" />
                                            </div>
                                        ) : (
                                            <div className="bg-black/10 p-2 text-xs truncate">Attachment: {msg.fileUrl}</div>
                                        )}
                                    </div>
                                )}
                                
                                {!isMe && <p className="text-[10px] font-bold opacity-70 mb-0.5">{msg.user.name}</p>}
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.noiDung}</p>
                                <div className={`text-[9px] mt-1 flex justify-end opacity-70 ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                    {formatMessageTime(msg.createdAt)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-px w-full" />
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t flex items-center gap-2 relative z-10">
            {/* Attachment Buttons - Visual Only for now */}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => toast.info("Tính năng gửi file đang phát triển")}>
                <Paperclip className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => toast.info("Tính năng gửi ảnh đang phát triển")}>
                <ImageIcon className="size-5" />
            </Button>

            <Input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..." 
                className="flex-1 bg-muted/20 border-muted-foreground/20 focus-visible:ring-1"
            />
            
            <Button 
                onClick={handleSend} 
                disabled={isSending || !inputText.trim()}
                className="shrink-0"
            >
                {isSending ? <Loader2 className="animate-spin size-4" /> : <Send className="size-4" />}
            </Button>
        </div>
    </div>
  );
}
