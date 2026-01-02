"use client";

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Ban,
  MessageSquareOff,
  Bell,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ==================== TYPES ====================

type NotificationData = {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: string;
  daXem: boolean;
  metadata: unknown;
  ngayTao: Date;
};

// ==================== ICON MAPPING ====================

const ICON_MAP: Record<string, typeof Ban> = {
  KIEM_DUYET: AlertTriangle,
  KHOA_HOC: MessageSquareOff,
  HE_THONG: Bell,
};

const ICON_COLOR_MAP: Record<string, string> = {
  KIEM_DUYET: "text-red-500",
  KHOA_HOC: "text-orange-500",
  HE_THONG: "text-blue-500",
};

// ==================== COMPONENT ====================

export function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: NotificationData;
  onRead: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const Icon = ICON_MAP[notification.loai] || Bell;
  const iconColor = ICON_COLOR_MAP[notification.loai] || "text-muted-foreground";

  const handleClick = () => {
    if (!notification.daXem) {
      onRead();
    }

    // Navigate if has URL in metadata
    const meta = notification.metadata as { url?: string };
    if (meta?.url) {
      router.push(meta.url);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation/read
    onDelete();
  };

  return (
    <div
      className={cn(
        "group relative p-4 hover:bg-accent cursor-pointer transition-colors pr-10", // Added padding-right for delete button
        !notification.daXem && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
            !notification.daXem ? "bg-primary/10" : "bg-muted"
          )}
        >
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm",
              !notification.daXem ? "font-semibold" : "font-medium"
            )}
          >
            {notification.tieuDe}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {notification.noiDung}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {formatDistanceToNow(new Date(notification.ngayTao), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.daXem && (
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
        )}
      </div>

      {/* Delete Button - Visible on hover or always if mobile */}
      <button
        className="absolute top-2 right-2 p-1.5 hover:bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={handleDelete}
        title="Xóa thông báo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
