import "server-only";

import { prisma } from "@/lib/db";

export async function getAllCourses(){
  await new Promise((resolve)=>setTimeout(resolve,2000)) ;
  const data = await prisma.khoaHoc.findMany({
    where:{
        trangThai:"BanChinhThuc",
    },
    orderBy:{
      ngayTao:"desc"
    },
    select:{
      tenKhoaHoc:true,
      gia:true,
      moTaNgan:true,
      duongDan:true,
      id:true,
      capDo:true,
      thoiLuong:true,
      danhMuc:true,
      tepKH:true,
      // Category with parent hierarchy
      danhMucRef: {
        select: {
          id: true,
          tenDanhMuc: true,
          danhMucCha: {
            select: {
              id: true,
              tenDanhMuc: true,
              danhMucCha: {
                select: {
                  id: true,
                  tenDanhMuc: true,
                },
              },
            },
          },
        },
      },
      // Level relation
      capDoRef: {
        select: {
          id: true,
          tenCapDo: true,
        },
      },
      // Teacher info (only safe fields)
      nguoiDung: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      // Ratings for average calculation
      danhGias: {
        where: { trangThai: "HIEN" },
        select: { diemDanhGia: true }
      }
    }
  });
  return data;
}

export type PublicCourseType = Awaited<ReturnType<typeof getAllCourses>>[0]