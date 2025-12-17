import "server-only";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export async function checkIfCourseBought(idKhoaHoc: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user) return false;

  const dangKyHoc = await prisma.dangKyHoc.findUnique({
    where: {
      idNguoiDung_idKhoaHoc: {
        idNguoiDung: session.user.id,
        idKhoaHoc: idKhoaHoc,
      },
    },
  });

  if (!dangKyHoc) return false;

  return dangKyHoc.trangThai === "DaThanhToan";
}