import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NotificationHistoryClient } from "./_components/NotificationHistoryClient";
import { checkBanStatus } from "@/app/data/user/check-ban-status";

export const metadata = {
  title: "Thông báo | NT E-Learning",
  description: "Xem lịch sử thông báo của bạn",
};

export default async function NotificationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  await checkBanStatus(session.user.id);

  return (
    <div className="container max-w-3xl mx-auto py-10">
      <NotificationHistoryClient />
    </div>
  );
}
