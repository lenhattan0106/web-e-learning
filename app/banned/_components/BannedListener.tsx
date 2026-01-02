"use client";

import { useEffect } from "react";
import Pusher from "pusher-js";
import { env } from "@/lib/env";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function BannedListener({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    // Initialize Pusher Client
    const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: "ap1",
      authEndpoint: "/api/pusher/auth",
    });

    const channel = pusher.subscribe(`private-user-${userId}`);

    // Listen for unban event
    channel.bind("user:unbanned", (data: { message: string }) => {
      toast.success(data.message || "Tài khoản của bạn đã được mở khóa!");
      
      // Force refresh to bypass cache and redirect
      router.refresh();
      window.location.href = "/"; 
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${userId}`);
      pusher.disconnect();
    };
  }, [userId, router]);

  return null;
}
