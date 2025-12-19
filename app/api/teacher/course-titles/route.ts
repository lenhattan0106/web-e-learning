import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/app/data/teacher/require-teacher";

export async function GET() {
  // Chỉ cho phép teacher gọi API này
  await requireTeacher();

  const courses = await prisma.khoaHoc.findMany({
    select: {
      tenKhoaHoc: true,
    },
    orderBy: {
      tenKhoaHoc: "asc",
    },
  });

  const titles = courses
    .map((c) => c.tenKhoaHoc)
    .filter(Boolean);

  return NextResponse.json(titles);
}


