import "server-only";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function getIndivialCourse(slug: string) {
  const khoaHoc = await prisma.khoaHoc.findUnique({
    where: {
      duongDan: slug,
      // Chỉ cho phép xem khóa học đã xuất bản (BanChinhThuc)
      // Khóa học bản nháp hoặc lưu trữ sẽ không hiển thị cho public
      trangThai: "BanChinhThuc",
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
      // Ratings with user info for display
      danhGias: {
        where: { trangThai: "HIEN" },
        orderBy: { ngayTao: "desc" },
        take: 10,
        select: {
          id: true,
          diemDanhGia: true,
          noiDung: true,
          ngayTao: true,
          nguoiDung: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
  if(!khoaHoc){
    return notFound();
  }
  return khoaHoc; 
}
