"use server";

import { requireAdmin } from "@/app/data/admin/required-admin";
import aj, { detectBot, fixedWindow } from "@/lib/arcjet";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { courseSchema, CourseSchemaType } from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { headers } from "next/headers";


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
  
export async function CreateCourse(values:CourseSchemaType):Promise<ApiResponse>{
   const session = await requireAdmin();
   try{
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
     const validation = courseSchema.safeParse(values);
     if(!validation.success){
        return {
            status:"error",
            message:"Dữ liệu biểu mẫu không hợp lệ",
        }
     };
    await prisma.course.create({
         data:{
             ...validation.data,
             userId:session?.user.id as string
         }
     });
     return {
        status:"success",
        message:"Tạo khóa học thành công",
     }
    }
    catch{
      return {
         status:"error",
         message:"Tạo khóa học thất bại"
      }
    }

}