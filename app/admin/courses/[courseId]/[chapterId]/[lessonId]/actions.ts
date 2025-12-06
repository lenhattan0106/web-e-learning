"use server";

import { requireAdmin } from "@/app/data/admin/required-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { lessonSchema, LessonSchemaType } from "@/lib/zodSchemas";

export async function updateLesson(values: LessonSchemaType,lessonId:string):Promise<ApiResponse>{
    await requireAdmin();
    try{
      const result = lessonSchema.safeParse(values);
      if(!result.success){
        return {
            status:"error",
            message:"Dữ liệu của bạn không hợp lệ"
        };
      }
      await prisma.lesson.update({
        where:{
            id:lessonId,
        },
        data:{
            title:result.data.name,
            description:result.data.description,
            thumbnailKey:result.data.thumbnailKey,
            videoKey:result.data.videoKey,
        }
      });
      return {
        status:"success",
        message:"Khóa học đã được cập nhật thành công",
      }
    }
    catch{  
    return{
        status:"error",
        message:"Lỗi khi cập nhật khóa học",
    }
    }
}