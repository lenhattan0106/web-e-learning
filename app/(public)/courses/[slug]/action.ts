"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { vnpay } from "@/lib/vnpay";
import { ProductCode, VnpLocale } from "vnpay";
import { requireUser } from "@/app/data/user/require-user";
import aj, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { request } from "@arcjet/next";
import { env } from "@/lib/env";

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

export async function enrollInCourseAction(idKhoaHoc: string) {
  const user = await requireUser();
  let paymentUrl = ""; 

  try {
    // Kiểm tra rate limit với Arcjet
    const req = await request();
    const decision = await arcjet.protect(req, {
      fingerprint: user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau.",
      };
    }

    // Tìm thông tin khóa học
    const khoaHoc = await prisma.khoaHoc.findUnique({
      where: { id: idKhoaHoc },
      select: {
        id: true,
        tenKhoaHoc: true,
        gia: true,
        duongDan: true,
      },
    });

    if (!khoaHoc) {
      return {
        status: "error",
        message: "Không tìm thấy khóa học",
      };
    }

    // Kiểm tra enrollment hiện tại
    const existingDangKy = await prisma.dangKyHoc.findUnique({
      where: {
        idNguoiDung_idKhoaHoc: {
          idNguoiDung: user.id,
          idKhoaHoc: khoaHoc.id,
        },
      },
      select: {
        trangThai: true,
        id: true,
      },
    });

    // Nếu đã thanh toán rồi
    if (existingDangKy?.trangThai === "DaThanhToan") {
      return {
        status: "success",
        message: "Bạn đã đăng ký khóa học này rồi.",
      };
    }

    // ✅ XÓA ENROLLMENT CŨ NẾU CÓ (DangXuLy hoặc DaHuy)
    if (existingDangKy) {
      await prisma.dangKyHoc.delete({
        where: { id: existingDangKy.id },
      });
      console.log("🗑️ Đã xóa enrollment cũ:", existingDangKy.id);
    }

    // ✅ LUÔN TẠO ENROLLMENT MỚI
    const dangKyHoc = await prisma.dangKyHoc.create({
      data: {
        idNguoiDung: user.id,
        idKhoaHoc: khoaHoc.id,
        soTien: khoaHoc.gia,
        trangThai: "DangXuLy",
      },
    });

    console.log("✨ Đã tạo enrollment mới:", dangKyHoc.id);

    // Lấy IP address
    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";

    // Tạo payment URL với enrollment ID mới
    const enrollmentId = dangKyHoc.id;
    paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: khoaHoc.gia,
      vnp_TxnRef: enrollmentId, // ID mới, unique
      vnp_OrderInfo: `Thanh toán khoá học: ${khoaHoc.tenKhoaHoc}`,
      vnp_OrderType: ProductCode.Other,
      vnp_IpAddr: clientIP,
      vnp_Locale: VnpLocale.VN,
      vnp_ReturnUrl:
        env.VNPAY_RETURN_URL || "http://localhost:3000/payment/return",
    });

    console.log("Đã tạo URL thanh toán cho enrollment:", enrollmentId);
  } catch (error) {
    console.error("Lỗi khi mua khóa học:", error);
    return {
      status: "error",
      message: "Đã xảy ra lỗi khi xử lý thanh toán. Vui lòng thử lại.",
    };
  }

  // Redirect ở ngoài try/catch
  redirect(paymentUrl);
}
