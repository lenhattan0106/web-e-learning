import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/app/data/teacher/require-teacher";

export async function GET() {
  // Chỉ cho phép teacher gọi API này
  await requireTeacher();

  const courses = await prisma.khoaHoc.findMany({
    where: {
      idNguoiDung: (await requireTeacher()).user.id,
    },
    select: {
      id: true,
      tenKhoaHoc: true,
    },
    orderBy: {
      tenKhoaHoc: "asc",
    },
  });

  const data = courses.map((c) => ({
    id: c.id,
    title: c.tenKhoaHoc,
  }));

  return NextResponse.json(data);
}


