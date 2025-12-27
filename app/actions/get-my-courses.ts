"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";

export async function getMyCourses() {
  const session = await requireUser();

  const courses = await prisma.khoaHoc.findMany({
    where: {
      OR: [
        // Courses I enrolled in
        {
            dangKyHocs: {
                some: {
                    idNguoiDung: session.id,
                    trangThai: "DaThanhToan"
                }
            }
        },
        // Courses I teach (if I am a teacher)
        {
            idNguoiDung: session.id
        }
      ]
    },
    select: {
      id: true,
      tenKhoaHoc: true,
      tepKH: true,
      phongChat: {
        select: {
          id: true,
          tinNhans: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            },
            select: {
              noiDung: true,
              createdAt: true,
              fileUrl: true,
              fileType: true
            }
          }
        }
      }
    },
    orderBy: {
      ngayTao: 'desc'
    }
  });

  return courses.map(c => ({
    id: c.id,
    tenKhoaHoc: c.tenKhoaHoc,
    tepKH: c.tepKH,
    chatRoomId: c.phongChat?.id,
    lastMessage: c.phongChat?.tinNhans[0] || null
  }));
}
