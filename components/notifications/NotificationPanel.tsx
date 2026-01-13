"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/app/actions/notification";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { useNotifications } from "./NotificationProvider";
import { Bell, Check, Loader2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

type NotificationData = {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: string;
  daXem: boolean;
  metadata: unknown;
  ngayTao: Date;
};

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { refreshCount, unreadCount } = useNotifications();

  // Fetch all notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { notifications } = await getNotifications(undefined, 20);
      setNotifications(notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, daXem: true })));
      refreshCount();
    });
  };

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, daXem: true } : n))
    );
    refreshCount();
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
    refreshCount();
  };

  return (
    <div className="flex flex-col w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Thông báo</h3>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Đọc tất cả
          </Button>
        )}
      </div>

      {/* Content - Scrollable */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 opacity-50" />
            </div>
            <p className="text-sm font-medium">Không có thông báo</p>
            <p className="text-xs mt-1 text-muted-foreground/70">
              Bạn chưa có thông báo nào
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => handleMarkRead(notification.id)}
                onDelete={() => handleDelete(notification.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer - Always show */}
      <div className="px-3 py-2 border-t">
        <Link href="/notifications" className="block">
          <Button 
            variant="ghost" 
            className="w-full h-9 text-sm font-medium text-muted-foreground hover:text-foreground justify-center gap-2"
          >
            Xem tất cả thông báo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
