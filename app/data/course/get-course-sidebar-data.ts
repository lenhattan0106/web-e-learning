import "server-only";
import { requireUser } from "../user/require-user";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function getCourseSideBarData(slug: string) {
  const session = await requireUser();

  const khoaHoc = await prisma.khoaHoc.findUnique({
    where: {
      duongDan: slug,
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      tepKH: true,
      thoiLuong: true,
      danhMuc: true,
      duongDan: true,
      chuongs: {
        orderBy: {
          thuTu: "asc",
        },
        select: {
          id: true,
          tenChuong: true,
          thuTu: true,
          baiHocs: {
            orderBy: {
              thuTu: "asc",
            },
            select: {
              id: true,
              tenBaiHoc: true,
              thuTu: true,
              moTa: true,
              tienTrinhHocs:{
                where:{
                  idNguoiDung: session.id,
                },
                select:{
                  hoanThanh:true,
                  idBaiHoc:true,
                  id:true
                }
              }
            },
          },
        },
      },
      phongChat: {
        select: {
          id: true,
          maMoi: true,
        },
      },
    },
  });
  if (!khoaHoc) {
    return notFound();
  }
  // Allow admin to bypass enrollment check
  if (session.role === "admin") {
    return {
      khoaHoc,
    };
  }

  const dangKyHoc = await prisma.dangKyHoc.findUnique({
    where: {
      idNguoiDung_idKhoaHoc: {
        idNguoiDung: session.id,
        idKhoaHoc: khoaHoc.id,
      },
    },
  });
  if (!dangKyHoc || dangKyHoc.trangThai !== "DaThanhToan") {
    return notFound();
  }
  return {
    khoaHoc,
  };
}

export type CourseSideBarDataType = Awaited<ReturnType<typeof getCourseSideBarData >>