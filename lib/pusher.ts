import Pusher from "pusher";
import { env } from "./env";

// Tạo instance pusher
let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: env.PUSHER_APP_ID,
      key: env.NEXT_PUBLIC_PUSHER_KEY,
      secret: env.PUSER_SERCET,
      cluster: "ap1",
      useTLS: true,
    });
  }
  return pusherInstance;
}
// Thông báo 1 người
export async function triggerUserNotification(
  userId: string,
  eventName: string,
  data: unknown
) {
  const pusher = getPusherServer();
  await pusher.trigger(`private-user-${userId}`, eventName, data);
}
// Thông báo nhiều người
export async function triggerBatchNotification(
  userIds: string[],
  eventName: string,
  data: unknown
) {
  const pusher = getPusherServer();
  const channels = userIds.map((id) => `private-user-${id}`);
    const batchSize = 100;
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    await pusher.trigger(batch, eventName, data);
  }
}
