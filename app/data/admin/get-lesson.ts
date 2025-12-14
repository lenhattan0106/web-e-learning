import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./required-admin";
import { notFound } from "next/navigation";

export async function TeacherGetLesson(id:string){
    await requireAdmin();
    const data = await prisma.lesson.findUnique({
        where:{
            id:id,
        },
        select:{
           title: true,
           videoKey:true,
           thumbnailKey:true,
           description:true,
           id:true,
           position:true,
        },
    });
    if(!data){
        return notFound();
    }
    return data;
}

export type TeacherLessonType = Awaited<ReturnType<typeof TeacherGetLesson>>