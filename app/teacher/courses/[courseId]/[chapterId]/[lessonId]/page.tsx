import { TeacherGetLesson } from "@/app/data/teacher/get-lesson";
import { LessonForm } from "./_components/LessonForm";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string; courseId: string; chapterId: string }>;
}) {
  const { lessonId, courseId, chapterId } = await params;
  const data = await TeacherGetLesson(lessonId);

  return (
    <div>
      <LessonForm 
        data={data} 
        idBaiHoc={lessonId}
        idChuong={chapterId}
        idKhoaHoc={data.chuong.idKhoaHoc}
      />
    </div>
  );
}