import "server-only";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getCourseForUser(slug: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  const currentUserId = session?.user?.id;
  const currentUserRole = session?.user?.role;

  // Lấy khóa học mà không filter theo trạng thái
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
      trangThai: true, 
      idNguoiDung: true, 
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
      dangKyHocs: currentUserId ? {
        where: {
          idNguoiDung: currentUserId,
          trangThai: "DaThanhToan",
        },
        select: {
          id: true,
        },
        take: 1,
      } : false,
    },
  });

  if (!khoaHoc) {
    return notFound();
  }

  const isAdmin = currentUserRole === "admin";
  const isOwner = currentUserId === khoaHoc.idNguoiDung;
  const isEnrolled = Array.isArray(khoaHoc.dangKyHocs) && khoaHoc.dangKyHocs.length > 0;

  if (khoaHoc.trangThai === "BanChinhThuc") {
    return {
      ...khoaHoc,
      isArchived: false,
    };
  }
  
  if (khoaHoc.trangThai === "BanLuuTru") {
    if (isEnrolled || isAdmin || isOwner) {
      return {
        ...khoaHoc,
        isArchived: true, // Flag để hiển thị thông báo
      };
    }
    return notFound();
  }
  
  if (khoaHoc.trangThai === "BanNhap") {
    if (isOwner || isAdmin) {
      return {
        ...khoaHoc,
        isArchived: false,
        isDraft: true,
      };
    }
    return notFound();
  }

  if (khoaHoc.trangThai === "BiChan") {
    if (isOwner || isAdmin) {
      return {
        ...khoaHoc,
        isArchived: false,
        isBanned: true,
      };
    }
    return notFound();
  }

  return notFound();
}
