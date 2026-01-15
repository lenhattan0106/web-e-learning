"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import Pusher from "pusher-js";
import { env } from "@/lib/env";
import { getUnreadCount } from "@/app/actions/notification";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ==================== TYPES ====================

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  metadata: unknown;
  createdAt: Date;
};

type NotificationContextType = {
  unreadCount: number;
  refreshCount: () => Promise<void>;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshCount: async () => {},
  notifications: [],
  addNotification: () => {},
});

// ==================== PROVIDER ====================

export function NotificationProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  // Refresh unread count from server
  const refreshCount = useCallback(async () => {
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // Add new notification (from Pusher)
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    // Show toast notification
    toast(notification.title, {
      description: notification.message.substring(0, 100),
      action: {
        label: "Xem",
        onClick: () => {
          // Navigate to notification if has URL
          const meta = notification.metadata as { url?: string; path?: string };
          const targetUrl = meta?.path || meta?.url;
          
          if (targetUrl) {
            router.push(targetUrl);
          }
        },
      },
    });
  }, []);

  useEffect(() => {
    refreshCount();

    // Initialize Pusher
    const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: "ap1",
      authEndpoint: "/api/pusher/auth",
    });

    // Subscribe to user's private channel
    const channel = pusher.subscribe(`private-user-${userId}`);

    // Listen for new notifications
    channel.bind("new-notification", (data: Notification) => {
      addNotification(data);
    });

    // Cleanup
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${userId}`);
      pusher.disconnect();
    };
  }, [userId, refreshCount, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshCount,
        notifications,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ==================== HOOK ====================

export const useNotifications = () => useContext(NotificationContext);

