"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/app/actions/notification";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Check,
  Loader2,
  Trash2,
  AlertTriangle,
  MessageSquareOff,
  ArrowLeft,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { LoaiThongBao } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationData = {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: LoaiThongBao;
  daXem: boolean;
  metadata: unknown;
  ngayTao: Date;
};

const ICON_MAP: Record<string, typeof Bell> = {
  KIEM_DUYET: AlertTriangle,
  KHOA_HOC: MessageSquareOff,
  HE_THONG: Bell,
};

const TYPE_LABELS: Record<string, string> = {
  HE_THONG: "Hệ thống",
  KIEM_DUYET: "Kiểm duyệt",
  KHOA_HOC: "Khóa học",
};

const TYPE_COLORS: Record<string, string> = {
  HE_THONG: "bg-blue-500",
  KIEM_DUYET: "bg-red-500",
  KHOA_HOC: "bg-orange-500",
};

export function NotificationHistoryClient() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const loadNotifications = async (cursor?: string, append = false) => {
    if (!append) setLoading(true);
    try {
      const result = await getNotifications(cursor, 20);
      if (append) {
        setNotifications((prev) => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      await loadNotifications();
    });
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, daXem: true } : n))
    );
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id)); // Optimistic delete
    await deleteNotification(id);
  };

  const handleClick = (notification: NotificationData) => {
    if (!notification.daXem) {
      handleMarkRead(notification.id);
    }
    const meta = notification.metadata as { url?: string; path?: string };
    const targetUrl = meta?.path || meta?.url;
    
    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      loadNotifications(nextCursor, true);
    }
  };

  // Filter notifications by type
  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.loai === activeTab);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
              <p className="text-muted-foreground text-sm">Quản lý tất cả thông báo của bạn</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isPending || notifications.every(n => n.daXem)}
              className="hidden md:flex"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Đánh dấu đã đọc tất cả
            </Button>
          </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-background/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-4 bg-muted/30">
              <TabsList className="bg-transparent h-12 w-full justify-start gap-4 p-0">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2"
                >
                  Tất cả
                </TabsTrigger>
                <TabsTrigger 
                  value="KIEM_DUYET"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2"
                >
                  Kiểm duyệt
                </TabsTrigger>
                <TabsTrigger 
                  value="KHOA_HOC"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2"
                >
                  Khóa học
                </TabsTrigger>
                <TabsTrigger 
                  value="HE_THONG"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2"
                >
                  Hệ thống
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="m-0 min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-10 w-10 opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium">Không có thông báo</h3>
                  <p className="text-sm">Bạn chưa có thông báo nào trong mục này</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {filteredNotifications.map((notification) => {
                        const Icon = ICON_MAP[notification.loai] || Bell;
                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0, padding: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => handleClick(notification)}
                            className={cn(
                              "group flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer relative",
                              !notification.daXem && "bg-blue-50/40 dark:bg-blue-950/10"
                            )}
                          >
                            {/* Icon */}
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border",
                              !notification.daXem ? "bg-background" : "bg-muted/50"
                            )}>
                              <Icon
                                className={cn(
                                  "h-5 w-5",
                                  notification.loai === "KIEM_DUYET" && "text-red-500",
                                  notification.loai === "KHOA_HOC" && "text-orange-500",
                                  notification.loai === "HE_THONG" && "text-blue-500"
                                )}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-8">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal h-5">
                                  {TYPE_LABELS[notification.loai]}
                                </Badge>
                                {!notification.daXem && (
                                  <Badge className="px-1.5 py-0 text-[10px] h-5 bg-blue-500 hover:bg-blue-600 border-none">Mới</Badge>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(notification.ngayTao), {
                                    addSuffix: true,
                                    locale: vi,
                                  })}
                                </span>
                              </div>
                              
                              <h4 className={cn(
                                "text-sm font-medium leading-none mb-1.5",
                                !notification.daXem && "font-bold text-foreground",
                                notification.daXem && "text-foreground/80"
                              )}>
                                {notification.tieuDe}
                              </h4>
                              
                              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                {notification.noiDung}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md shadow-sm border p-0.5">
                                {!notification.daXem && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                    onClick={(e) => handleMarkRead(notification.id, e)}
                                    title="Đánh dấu đã đọc"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => handleDelete(notification.id, e)}
                                  title="Xóa thông báo"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loading} className="w-full md:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Tải thêm thông báo cũ hơn
          </Button>
        </div>
      )}
    </div>
  );
}

