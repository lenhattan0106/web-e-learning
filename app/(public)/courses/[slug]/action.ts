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
import { verifyCoupon } from "./_actions/coupon";

const arcjet = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

export async function enrollInCourseAction(idKhoaHoc: string, couponCode?: string) {
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
    // --- 1. KIỂM TRA ENROLLMENT CŨ ---
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

    // Nếu đã thanh toán rồi -> Return ngay
    if (existingDangKy?.trangThai === "DaThanhToan") {
      return {
        status: "success",
        message: "Bạn đã đăng ký khóa học này rồi.",
      };
    }

    // Nếu có enrollment cũ (DangXuLy hoặc DaHuy) -> Xóa để tạo mới cho sạch
    if (existingDangKy) {
      await prisma.dangKyHoc.delete({
        where: { id: existingDangKy.id },
      });
      console.log("🗑️ Đã xóa enrollment cũ:", existingDangKy.id);
    }

    // --- 2. LOGIC XỬ LÝ COUPON ---
    let finalPrice = khoaHoc.gia;
    let appliedCouponId = null;
    let orderInfo = `Thanh toán khoá học: ${khoaHoc.tenKhoaHoc}`;

    if (couponCode) {
        const verifyResult = await verifyCoupon(couponCode, idKhoaHoc);
        if (!verifyResult.isValid) {
            return {
                status: "error",
                message: verifyResult.error || "Mã giảm giá không hợp lệ",
            };
        }
        finalPrice = verifyResult.discountedPrice;
        
        const couponDb = await prisma.maGiamGia.findUnique({
            where: { maGiamGia: verifyResult.couponCode }
        });
        if (couponDb) {
            appliedCouponId = couponDb.id;
            orderInfo = `Thanh toan khoa hoc ${khoaHoc.tenKhoaHoc} Ma ${verifyResult.couponCode}`;
            orderInfo = orderInfo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/gi, '');
        }
    }

    // Đảm bảo giá là số nguyên
    finalPrice = Math.round(finalPrice);   
    
    // --- 3. XỬ LÝ THANH TOÁN ---
    
    // MIỄN PHÍ HOẶC GIẢM 100% (Giá <= 0)
    if (finalPrice <= 0) {
         try {
            await prisma.$transaction(async (tx) => {
                // Tạo enrollment với trạng thái ĐÃ THANH TOÁN luôn
                await tx.dangKyHoc.create({
                    data: {
                        idNguoiDung: user.id,
                        idKhoaHoc: khoaHoc.id,
                        soTien: 0,
                        phiSan: 0,
                        thanhToanThuc: 0,
                        trangThai: "DaThanhToan",
                        maGiamGiaId: appliedCouponId,
                    }
                });

                // Cập nhật coupon nếu có
                if (appliedCouponId) {
                    await tx.maGiamGia.update({
                        where: { id: appliedCouponId },
                        data: { daSuDung: { increment: 1 } }
                    });
                }
            });
         } catch (error) {
             console.error("Free enrollment error:", error);
             return { status: "error", message: "Lỗi xử lý đăng ký miễn phí" };
         }

         // Redirect thẳng vào học
         redirect(`/courses/${khoaHoc.duongDan}/learn`);
    }

    //THANH TOÁN QUA VNPAY (Giá > 0)
    
    // Tạo enrollment trạng thái CHỜ XỬ LÝ
    const dangKyHoc = await prisma.dangKyHoc.create({
      data: {
        idNguoiDung: user.id,
        idKhoaHoc: khoaHoc.id,
        soTien: finalPrice, 
        trangThai: "DangXuLy",
        maGiamGiaId: appliedCouponId,
      },
    });

    console.log("✨ Đã tạo enrollment mới (Chờ VNPay):", dangKyHoc.id, "Giá:", finalPrice);

    // Lấy IP address
    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "127.00.1";

    // Tạo payment URL
    const enrollmentId = dangKyHoc.id;
    paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: finalPrice,
      vnp_TxnRef: enrollmentId,
      vnp_OrderInfo: orderInfo,
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

  // Redirect VNPay
  redirect(paymentUrl);
}
