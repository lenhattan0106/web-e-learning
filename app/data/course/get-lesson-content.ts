import "server-only";
import { requireUser } from "../user/require-user";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function getLessonContent(idBaiHoc: string) {
  const session = await requireUser();

  const baiHoc = await prisma.baiHoc.findUnique({
    where: {
      id: idBaiHoc,
    },
    select: {
      id: true,
      tenBaiHoc: true,
      moTa: true,
      anhBaiHoc: true,
      maVideo: true,
      thuTu: true,
      tienTrinhHocs:{
        where:{
          idNguoiDung:session.id,
        },
        select:{
          hoanThanh:true,
          idBaiHoc:true
        }
      },
      chuong: {
        select: {
          idKhoaHoc: true,
          khoaHoc:{
            select:{
              duongDan:true
            }
          }
        },
      },
    },
  });
  if (!baiHoc) {
    return notFound();
  }
  // Allow admin to bypass enrollment check
  if (session.role === "admin") {
      return baiHoc;
  }

  const dangKyHoc = await prisma.dangKyHoc.findUnique({
    where: {
      idNguoiDung_idKhoaHoc: {
        idNguoiDung: session.id,
        idKhoaHoc: baiHoc.chuong.idKhoaHoc,
      },
    },
    select:{
        trangThai:true
    }
  });
  if(!dangKyHoc || dangKyHoc.trangThai !=="DaThanhToan"){
     return notFound();
  }
  return baiHoc;
}

export type LessonContentType = Awaited<ReturnType<typeof getLessonContent>>