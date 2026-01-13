import "server-only";
import { requireUser } from "./require-user";
import { prisma } from "@/lib/db";

export async function getEnrolledCourses() {
  const user = await requireUser();
  const data = await prisma.dangKyHoc.findMany({
    where: {
      idNguoiDung: user.id,
      trangThai: "DaThanhToan",
    },
    select: {
      khoaHoc: {
        select: {
          id: true,
          moTaNgan: true,
          tenKhoaHoc: true,
          tepKH: true,
          capDo: true,
          duongDan: true,
          thoiLuong: true,
          trangThai: true, 
          chuongs: {
            select: {
              id: true,
              baiHocs: {
                  select:{
                    id:true,
                    tienTrinhHocs:{
                      where:{
                        idNguoiDung:user.id
                      },
                      select:{
                        id:true,
                        hoanThanh:true,
                        idBaiHoc:true
                      }
                    }
                  }
              },
            },
          },
        },
      },
    },
  });
  return data;
}

export type EnrolledCourseType = Awaited<ReturnType<typeof getEnrolledCourses>>[0];