"use server";

import { requireAdmin } from "@/app/data/admin/required-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { courseSchema, CourseSchemaType } from "@/lib/zodSchemas";

export async function editCourse(data: CourseSchemaType, courseId:string): Promise<ApiResponse>{
    const user = await requireAdmin();
    try{
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