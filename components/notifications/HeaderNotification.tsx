"use client";

import { authClient } from "@/lib/auth-client";
import {
  NotificationBell,
  NotificationProvider,
} from "@/components/notifications";

export function HeaderNotification() {
  const { data: session } = authClient.useSession();

  if (!session?.user?.id) {
    return null;
  }

  return (
    <NotificationProvider userId={session.user.id}>
      <NotificationBell />
    </NotificationProvider>
  );
}
