import { getMyCourses } from "@/app/actions/get-my-courses";
import { ChatLayout } from "@/app/components/chat/ChatLayout";

export default async function DashboardChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const courses = await getMyCourses();

  return (
    <ChatLayout courses={courses} baseUrl="/dashboard/chat">
      {children}
    </ChatLayout>
  );
}
