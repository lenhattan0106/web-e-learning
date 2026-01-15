import { getLessonContent } from "@/app/data/course/get-lesson-content";
import { CourseContent } from "./_components/CourseContent";
import { Suspense } from "react";
import { LessonSkeleton } from "./_components/LessonSkeleton";
import { CommentSection } from "@/components/comment/CommentSection";
import { getComments } from "./_actions/comment-actions";
import { requireUser } from "@/app/data/user/require-user";

type Params = Promise<{ lessonId: string }>;

export default async function LessonContentPage({
  params,
}: {
  params: Params;
}) {
  const { lessonId } = await params;
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LessonContentLoader lessonId={lessonId} />
    </Suspense>
  );
}

async function LessonContentLoader({ lessonId }: { lessonId: string }) {
  const session = await requireUser();
  const isAdmin = session.role === "admin";
  
  const [data, comments] = await Promise.all([
    getLessonContent(lessonId),
    getComments(lessonId, isAdmin), // Admins can see hidden comments
  ]);

  return (
    <div className="space-y-8">
      <CourseContent data={data} />
      
      {/* Comment Section */}
      <div className="pl-6 pr-4 pb-8">
        <CommentSection
          comments={comments}
          idBaiHoc={lessonId}
          currentUserId={session.id}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
