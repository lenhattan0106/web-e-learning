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
  
  // Get all users who have purchased at least one course from this teacher
  const students = await prisma.user.findMany({
    where: {
        dangKyHocs: {
            some: {
                khoaHoc: {
                    idNguoiDung: session.user.id
                },
                trangThai: "DaThanhToan"
            }
        }
    },
    select: {
        id: true,
        name: true,
        email: true,
        image: true,
        dangKyHocs: {
            where: {
                khoaHoc: {
                    idNguoiDung: session.user.id
                },
                trangThai: "DaThanhToan"
            },
            include: {
                khoaHoc: {
                    select: {
                        tenKhoaHoc: true
                    }
                }
            }
        },
        _count: {
             select: {
                tienTrinhHocs: {
                    where: {
                        baiHoc: {
                            chuong: {
                                khoaHoc: {
                                    idNguoiDung: session.user.id
                                }
                            }
                        },
                        hoanThanh: true
                    }
                }
             }
        }
    }
  });

  return students;
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
