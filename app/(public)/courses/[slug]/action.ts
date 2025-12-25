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

    // --- LOGIC XỬ LÝ COUPON ---
    let finalPrice = khoaHoc.gia;
    let appliedCouponId = null;
    let orderInfo = `Thanh toán khoá học: ${khoaHoc.tenKhoaHoc}`;

    if (couponCode) {
        const verifyResult = await verifyCoupon(couponCode, idKhoaHoc);
        if (!verifyResult.isValid) {
            // Nếu coupon không hợp lệ, trả lỗi luôn (hoặc có thể fallback về giá gốc tùy business, nhưng trả lỗi an toàn hơn)
            return {
                status: "error",
                message: verifyResult.error || "Mã giảm giá không hợp lệ",
            };
        }
        finalPrice = verifyResult.discountedPrice;
        
        // Lấy lại ID coupon từ DB để lưu vào DangKyHoc (vì verifyCoupon trả code normalized)
        // Lưu ý: verifyCoupon check logic ok nhưng để lấy ID chính xác ta query nhẹ lại hoặc update verifyCoupon trả ID.
        // Tối ưu: Update verifyCoupon trả về couponId luôn.
        // Nhưng ở đây ta query nhanh lại cho chắc chắn.
        const couponDb = await prisma.maGiamGia.findUnique({
            where: { maGiamGia: verifyResult.couponCode }
        });
        if (couponDb) {
            appliedCouponId = couponDb.id;
            // Sanitizing content for VNPay: Remove (, ), :, and ensure pure text
            // Replace special chars with hyphen or space
            orderInfo = `Thanh toan khoa hoc ${khoaHoc.tenKhoaHoc} Ma ${verifyResult.couponCode}`;
            
            // Remove Vietnamese accents to be absolutely safe (standard VNPay practice often recommends ASCII)
            orderInfo = orderInfo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/gi, '');
        }
    }

    // Đảm bảo giá là số nguyên cho VNPay
    finalPrice = Math.round(finalPrice);   
    
    // VNPay không cho phép thanh toán 0 đồng
    if (finalPrice <= 0) {
         // Xử lý case 0 đồng (Free) -> Tự động Enroll không qua VNPay
         // Logic này cần thiết nếu coupon giảm 100%
         // ... Tạm thời assume >= 10000 VND (VNPay min limit)
         // Nếu < 10000 có thể VNPay sẽ lỗi khác, nhưng Code 70 là Signature.
         // Tuy nhiên, ta cứ sanitize orderInfo trước.
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
        soTien: finalPrice, // Lưu giá thực trả
        trangThai: "DangXuLy",
        maGiamGiaId: appliedCouponId, // Lưu coupon ID nếu có
      },
    });

    console.log("✨ Đã tạo enrollment mới:", dangKyHoc.id, "Giá:", finalPrice);

    // Lấy IP address
    const headersList = await headers();
    const clientIP =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";

    // Tạo payment URL với enrollment ID mới
    const enrollmentId = dangKyHoc.id;
    paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: finalPrice, // Sử dụng giá cuối cùng
      vnp_TxnRef: enrollmentId, // ID mới, unique
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

  // Redirect ở ngoài try/catch
  redirect(paymentUrl);
}
