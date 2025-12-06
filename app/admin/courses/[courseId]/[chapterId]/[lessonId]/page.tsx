import { TeacherGetLesson } from "@/app/data/admin/get-lesson";
import { LessonForm } from "./_components/LessonForm";

type Params =  Promise<{
    courseId:string,
    chapterId:string,
    lessonId:string,
}>

export default async function lessonIdPage({params}:{params:Params}){
    const {chapterId,courseId,lessonId} = await params;
    const lesson = await TeacherGetLesson(lessonId);


    return(
        <LessonForm chapterId={chapterId} data={lesson} courseId={courseId}></LessonForm>
    )
}