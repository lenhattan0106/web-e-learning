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

const ICON_BG_MAP: Record<string, string> = {
  KIEM_DUYET: "bg-red-100 dark:bg-red-950/50",
  KHOA_HOC: "bg-orange-100 dark:bg-orange-950/50",
  HE_THONG: "bg-blue-100 dark:bg-blue-950/50",
};

const ICON_COLOR_MAP: Record<string, string> = {
  KIEM_DUYET: "text-red-600 dark:text-red-400",
  KHOA_HOC: "text-orange-600 dark:text-orange-400",
  HE_THONG: "text-blue-600 dark:text-blue-400",
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
  const iconBg = ICON_BG_MAP[notification.loai] || "bg-muted";

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
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={cn(
        "group relative px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors",
        !notification.daXem && "bg-primary/5"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
            iconBg
          )}
        >
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium line-clamp-1">
              {notification.tieuDe}
            </p>
            {/* Unread indicator */}
            {!notification.daXem && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {notification.noiDung}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-medium">
            {formatDistanceToNow(new Date(notification.ngayTao), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        </div>
      </div>

      {/* Delete Button */}
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
