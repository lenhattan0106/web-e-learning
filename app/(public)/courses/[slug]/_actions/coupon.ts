"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";

export type CouponVerificationResult =
  | {
      isValid: true;
      discountedPrice: number;
      discountAmount: number;
      originalPrice: number;
      couponCode: string; // Trả về code đã chuẩn hóa (nếu cần)
      message: string;
    }
  | {
      isValid: false;
      error: string;
      code?: string; // Trả lại mã để UI hiển thị nếu muốn
    };

export async function verifyCoupon(
  code: string,
  courseId: string
): Promise<CouponVerificationResult> {
  const user = await requireUser();

  if (!code || !code.trim()) {
    return { isValid: false, error: "Vui lòng nhập mã giảm giá" };
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    // 1. Tìm coupon
    const coupon = await prisma.maGiamGia.findUnique({
      where: { maGiamGia: normalizedCode },
      include: {
        maGiamGiaKhoaHocs: {
            where: {
                khoaHocId: courseId
            }
        }
      },
    });

    if (!coupon) {
      return { isValid: false, error: "Mã giảm giá không tồn tại" };
    }

    // 2. Check trạng thái hoạt động
    if (!coupon.hoatDong) {
      return { isValid: false, error: "Mã giảm giá hiện đang tạm ngưng" };
    }

    // 3. Check thời gian
    const now = new Date();
    if (coupon.ngayBatDau && now < coupon.ngayBatDau) {
      return { isValid: false, error: "Mã giảm giá chưa đến thời gian hiệu lực" };
    }
    if (coupon.ngayKetThuc && now > coupon.ngayKetThuc) {
      return { isValid: false, error: "Mã giảm giá đã hết hạn" };
    }

    // 4. Check số lượng
    if (coupon.soLuong <= coupon.daSuDung) {
      return { isValid: false, error: "Mã giảm giá đã hết lượt sử dụng" };
    }

    // 5. Check phạm vi áp dụng (Khóa học này có được áp dụng không?)
    const isApplicable = coupon.maGiamGiaKhoaHocs.length > 0;

    // Lưu ý: Nếu logic của bạn là "Nếu không gán cụ thể cho khóa nào thì áp dụng tất cả" 
    // thì bỏ check này hoặc sửa lại. 
    // Nhưng data model hiện tại có bảng maGiamGiaKhoaHoc nên assume là phải link mới được dùng.
    if (!isApplicable) {
         return { isValid: false, error: "Mã giảm giá không áp dụng cho khóa học này" };
    }

    // 6. Check User đã dùng mã này cho CHÍNH KHÓA HỌC NÀY chưa (Chỉ check đơn thành công)
    const usedCount = await prisma.dangKyHoc.count({
      where: {
        idNguoiDung: user.id,
        maGiamGiaId: coupon.id,
        idKhoaHoc: courseId, 
        trangThai: "DaThanhToan",
      },
    });

    if (usedCount > 0) {
      return { isValid: false, error: "Bạn đã sử dụng mã này cho khóa học này rồi" };
    }

    // 7. Tính toán giá
    const course = await prisma.khoaHoc.findUnique({
      where: { id: courseId },
      select: { gia: true },
    });

    if (!course) {
        return { isValid: false, error: "Khóa học không tồn tại" };
    }

    let discountAmount = 0;
    if (coupon.loai === "PhanTram") {
      discountAmount = (course.gia * coupon.giaTri) / 100;
    } else {
      discountAmount = coupon.giaTri;
    }

    // Đảm bảo không giảm quá 100% (âm tiền)
    let finalPrice = course.gia - discountAmount;
    if (finalPrice < 0) finalPrice = 0;

    // Làm tròn số tiền (quan trọng cho VNPay)
    finalPrice = Math.round(finalPrice);
    discountAmount = course.gia - finalPrice; // Recalculate exact discount

    return {
      isValid: true,
      discountedPrice: finalPrice,
      discountAmount: discountAmount,
      originalPrice: course.gia,
      couponCode: normalizedCode,
      message: `Đã áp dụng mã ${normalizedCode}. Bạn tiết kiệm được ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(discountAmount)}`,
    };

  } catch (error) {
    console.error("Coupon verification error:", error);
    return { isValid: false, error: "Lỗi hệ thống khi kiểm tra mã giảm giá" };
  }
}
