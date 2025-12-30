import "server-only";

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function getUserDetails() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    include: {
      dangKyHocs: {
        where: {
          trangThai: "DaThanhToan"
        },
        select: {
          id: true
        }
      },
      _count: {
        select: {
          dangKyHocs: { where: { trangThai: "DaThanhToan" } },
          khoaHocs: true // courses created (if teacher)
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return users.map(user => {
    const hasCourse = user.dangKyHocs.length > 0;
    const isPremiumActive = user.isPremium && user.premiumExpires && user.premiumExpires > new Date();
    
    let type = "Free"; // Mặc định
    if (isPremiumActive && hasCourse) {
      type = "VIP";
    } else if (isPremiumActive) {
      type = "Premium";
    } else if (hasCourse) {
      type = "Learner";
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      role: user.role,
      userType: type,
      totalCoursesEnrolled: user._count.dangKyHocs,
    };
  });
}

export async function getRevenueDetails() {
  await requireAdmin();

  // Get Premium payments
  const premiumPayments = await prisma.thanhToanPremium.findMany({
    where: {
      trangThai: "DaThanhToan"
    },
    include: {
      nguoiDung: {
        select: {
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: {
      ngayTao: "desc"
    }
  });

  // Get Course payments (Platform Fee)
  const coursePayments = await prisma.dangKyHoc.findMany({
    where: {
      trangThai: "DaThanhToan",
      phiSan: { gt: 0 }
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
          tenKhoaHoc: true
        }
      }
    },
    orderBy: {
      ngayTao: "desc"
    }
  });

  // Combine and format
  const premiums = premiumPayments.map(p => ({
    id: p.id,
    type: "PREMIUM",
    user: p.nguoiDung,
    itemName: "Gói Premium (1 tháng)",
    amount: p.soTien, // Revenue for admin is 100%
    date: p.ngayTao,
  }));

  const courses = coursePayments.map(c => ({
    id: c.id,
    type: "COURSE_FEE",
    user: c.nguoiDung,
    itemName: `Phí sàn: ${c.khoaHoc.tenKhoaHoc}`,
    amount: c.phiSan, // Revenue for admin is only the fee
    date: c.ngayTao,
  }));

  // Merge and sort by date desc
  return [...premiums, ...courses].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getPremiumDetails() {
  await requireAdmin();

  const premiumUsers = await prisma.user.findMany({
    where: {
      isPremium: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      premiumExpires: true,
      updatedAt: true // Start date approximation if not tracked separately
    },
    orderBy: {
      premiumExpires: "asc" // Expiring soonest first
    }
  });

  return premiumUsers.map(user => {
    const now = new Date();
    const expires = user.premiumExpires ? new Date(user.premiumExpires) : new Date();
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...user,
      daysLeft,
      status: daysLeft > 0 ? "Active" : "Expired"
    };
  });
}

export async function getReportsDetails() {
  await requireAdmin();

  const reports = await prisma.baoCaoBinhLuan.findMany({
    include: {
      nguoiDung: { // Reporter
        select: { name: true, email: true, image: true }
      },
      binhLuan: {
        include: {
          nguoiDung: { // Comment author
             select: { name: true, email: true }
          },
          baiHoc: {
            select: { tenBaiHoc: true, chuong: { select: { khoaHoc: { select: { tenKhoaHoc: true } } } } }
          }
        }
      }
    },
    orderBy: {
      ngayTao: "desc"
    }
  });

  return reports;
}

export async function getCourseDetailsForAdmin() {
  await requireAdmin();
  
  const courses = await prisma.khoaHoc.findMany({
    include: {
      nguoiDung: { // Teacher
        select: { name: true, email: true, image: true }
      },
      chuongs: {
        select: {
          _count: {
            select: { baiHocs: true }
          }
        }
      },
      _count: {
        select: {
          dangKyHocs: true,
          chuongs: true,
        }
      }
    },
    orderBy: {
      ngayTao: "desc"
    }
  });

  return courses.map(course => {
    const totalLessons = course.chuongs.reduce((acc, chuong) => acc + chuong._count.baiHocs, 0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { chuongs, ...rest } = course;
    return {
      ...rest,
      totalLessons
    };
  });
}
