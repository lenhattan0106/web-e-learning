import "server-only";
import { prisma } from "@/lib/db";
import {requireAdmin} from "./required-admin"

export async function adminGetCourse(){
    await new Promise((resolve)=>setTimeout(resolve,2000));
    await requireAdmin();
    const data = await prisma.course.findMany({
        orderBy:{
            createdAt:"desc",

        },
        select:{
            id:true,
            title:true,
            smallDescription:true,
            duration:true,
            level:true,
            status:true,
            category:true,
            price:true,
            fileKey:true,
            slug:true,
        }
    })
  return data
}

export type AdminCourseType = Awaited<ReturnType<typeof adminGetCourse>>[0]