"use server";

import { requireAdmin } from "@/app/data/admin/required-admin";
import aj, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";


const arcjet = aj
.withRule(
  fixedWindow({
    mode:"LIVE",
    window:"1m",
    max:5,

  }));

export async function deleteCourse(courseId:string):Promise<ApiResponse>{
   const session = await requireAdmin();
    try {
        const req = await request();
           const decision = await arcjet.protect(req,{
            fingerprint: session.user.id,
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
      await prisma.course.delete({
        where:{
          id: courseId
        },
      });
      revalidatePath("/admin/courses");
      return {
        status:"success",
        message:"Khóa học của bạn đã được xóa thành công"
      }
    }
    catch{
       return{
        status:"error",
        message:"Lỗi khi xóa khóa học",
       }
    }
}