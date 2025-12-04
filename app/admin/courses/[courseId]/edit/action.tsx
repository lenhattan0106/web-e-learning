"use server";

import { requireAdmin } from "@/app/data/admin/required-admin";
import aj, { detectBot, fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { courseSchema, CourseSchemaType } from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";

const arcjet = aj.withRule(
  detectBot({
    mode:"LIVE",
    allow:[],
  })
).withRule(
  fixedWindow({
    mode:"LIVE",
    window:"1m",
    max:5
  }));
export async function editCourse(data: CourseSchemaType, courseId:string): Promise<ApiResponse>{
    const user = await requireAdmin();
    try{
        const req = await request();
         const decision = await arcjet.protect(req,{
      fingerprint: user.user.id,
     });
     if(decision.isDenied()){
      if(decision.reason.isRateLimit()){
         return {
            status:"error",
            message:"Bạn đã bị chặn do thực hiện quá nhiều yêu cầu"
         }
      }else{
         return{
            status:"error",
            message:"Chúng tôi nghi ngờ bạn là bot, nếu có vấn đề hãy liên hệ với support"
         }
      }
     }
      const result = courseSchema.safeParse(data);
      if(!result.success){
        return{
            status:"error",
            message:"Dữ liệu không hợp lệ"
        }
      }
      await prisma.course.update({
        where:{
            id: courseId,
            userId: user.user.id,
        },
        data:{
           ...result.data,
        }
      });
      return {
        status:"success",
        message:"Khóa học đã được cập nhật thành công"
      }
    }
    catch{
         return{
            status:"error",
            message:"Khóa học cập nhật thất bại"
         }
    }
}
export async function reorderLessons(chapterId:string,lesson:{id:string;position:number}[],
  courseId:string
): Promise<ApiResponse>{
  await requireAdmin();
  try{
   if(!lesson || lesson.length ===0){
      return{
        status:"error",
        message:"Không có bài học nào để sắp xếp lại.",
      }
   }
   const updates= lesson.map((lesson)=> prisma.lesson.update({
    where:{
      id:lesson.id,
      chapterId: chapterId,
    },
    data:{
      position:lesson.position,
    },
   }));
   await prisma.$transaction(updates);
   revalidatePath(`/admin/courses/${courseId}/edit`)
   return{
    status:"success",
    message:"Sắp xếp lại bài học thành công"
   }
  }catch{ 
    return{
      status:"error",
      message:"Lỗi khi sắp xếp bài học"
    }
  }
}
export async function reorderChapter(courseId:string,chapters:{id:string,position:number}[]):
Promise<ApiResponse>{
     await requireAdmin();
  try{
   if(!chapters||chapters.length ===0){
    return {
      status:"error",
      message:"Không có chương nào để mình sắp xếp lại",
    };
  }
  const updates = chapters.map((chapter)=>prisma.chapter.update({
    where:{
       id:chapter.id, courseId:courseId,
    },
    data:{
      position: chapter.position,
    }
  }));
  await prisma.$transaction(updates);
     revalidatePath(`/admin/courses/${courseId}/edit`);
     return{
      status:"success",
      message:"Sắp xếp lại các chương thành công"
     }
  }
  catch{
    return {
        status:"error",
        message:"Lỗi khi sắp xếp lại chương"
    }
  }
}