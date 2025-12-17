import "server-only";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function getIndivialCourse(slug: string) {
  const khoaHoc = await prisma.khoaHoc.findUnique({
    where: {
      duongDan: slug,
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      moTa: true,
      tepKH: true,
      gia: true,
      thoiLuong: true,
      capDo: true,
      danhMuc: true,
      moTaNgan: true,
      chuongs: {
        select: {
          id: true,
          tenChuong: true,
          baiHocs: {
            select: {
              id: true,
              tenBaiHoc: true,
            },
            orderBy: {
              thuTu: "asc",
            },
          },
        },
        orderBy: {
          thuTu: "asc",
        },
      },
    },
  });
  if(!khoaHoc){
    return notFound();
  }
  return khoaHoc; 
}
