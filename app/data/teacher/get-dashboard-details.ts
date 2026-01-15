import "server-only";
import { prisma } from "@/lib/db";
import { requireTeacher } from "./require-teacher";

export async function getRevenueDetails() {
  const session = await requireTeacher();
  const data = await prisma.dangKyHoc.findMany({
    where: {
        khoaHoc: {
            idNguoiDung: session.user.id
        },
        trangThai: "DaThanhToan"
    },
    include: {
        nguoiDung: {
            select: {
                name: true,
                email: true,
                image: true
            }
        },
        khoaHoc: {
            select: {
                tenKhoaHoc: true,
            }
        },
        maGiamGia: {
            select: {
                maGiamGia: true,
                loai: true,
                giaTri: true
            }
        }
    },
    orderBy: {
        ngayTao: 'desc'
    }
  });

  return data;
}


export async function getStudentDetails() {
  const session = await requireTeacher();
  
  // Lấy TẤT CẢ lượt mua (DangKyHoc) của các khóa học thuộc giáo viên
  const enrollments = await prisma.dangKyHoc.findMany({
    where: {
      khoaHoc: {
        idNguoiDung: session.user.id
      },
      trangThai: "DaThanhToan"
    },
    select: {
      id: true,
      ngayTao: true,
      soTien: true,
      phiSan: true,
      thanhToanThuc: true,
      nguoiDung: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      },
      khoaHoc: {
        select: {
          id: true,
          tenKhoaHoc: true,
        }
      }
    },
    orderBy: [
      { ngayTao: 'desc' },  
      { nguoiDung: { name: 'asc' } }  
    ]
  });

  return enrollments.map((enrollment) => {
    // Tính toán Net nếu chưa có (legacy data)
    const netPrice = enrollment.thanhToanThuc ?? 
      (enrollment.soTien - (enrollment.phiSan ?? Math.round(enrollment.soTien * 0.05)));

    return {
      id: enrollment.id, // ID của lượt mua (để làm key unique)
      student: {
        id: enrollment.nguoiDung.id,
        name: enrollment.nguoiDung.name,
        email: enrollment.nguoiDung.email,
        image: enrollment.nguoiDung.image,
      },
      course: {
        id: enrollment.khoaHoc.id,
        name: enrollment.khoaHoc.tenKhoaHoc,
      },
      purchaseDate: enrollment.ngayTao,
      netPrice: netPrice,
    };
  });
}

export async function getCourseDetails() {
  const session = await requireTeacher();

  const courses = await prisma.khoaHoc.findMany({
    where: {
        idNguoiDung: session.user.id
    },
    include: {
        dangKyHocs: {
            where: {
                trangThai: "DaThanhToan"
            }
        },
        chuongs: {
            include: {
                baiHocs: true
            }
        }
    },
    orderBy: {
        ngayTao: 'desc'
    }
  });

  return courses;
}

export async function getLessonDetails() {
  const session = await requireTeacher();

  const lessons = await prisma.baiHoc.findMany({
    where: {
      chuong: {
        khoaHoc: {
          idNguoiDung: session.user.id
        }
      }
    },
    include: {
      chuong: {
        select: {
          id: true,
          tenChuong: true,
          idKhoaHoc: true,
          khoaHoc: { 
            select: { 
                tenKhoaHoc: true 
            } 
          }
        }
      },
      _count: {
        select: {
          tienTrinhHocs: { where: { hoanThanh: true } }
        }
      }
    },
    orderBy: [
      { chuong: { khoaHoc: { tenKhoaHoc: 'asc' } } },
      { thuTu: 'asc' }
    ]
  });

  return lessons;
}
