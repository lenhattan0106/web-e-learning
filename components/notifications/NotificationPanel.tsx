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
import { Bell, Check, Loader2 } from "lucide-react";
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
  const { refreshCount } = useNotifications();

  // Fetch notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { notifications } = await getNotifications(undefined, 10);
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
      await loadNotifications();
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
    <div className="flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-base">Thông báo</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={isPending}
          className="h-8 text-xs"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Check className="h-3 w-3 mr-1" />
          )}
          Đã đọc tất cả
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">Không có thông báo mới</p>
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

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2 border-t">
          <Link href="/notifications">
            <Button variant="ghost" className="w-full text-sm h-8">
              Xem tất cả thông báo
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
