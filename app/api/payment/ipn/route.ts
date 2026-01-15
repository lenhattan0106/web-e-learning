import { NextRequest, NextResponse } from "next/server";
import { vnpay } from "@/lib/vnpay";
import { prisma } from "@/lib/db";
import {
  VerifyIpnCall,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  InpOrderAlreadyConfirmed,
  IpnSuccess,
  IpnUnknownError,
} from "vnpay";
import { sendNotification } from "@/app/services/notification-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());

    console.log("🔔 Nhận IPN từ VNPay:", queryParams);

    // Xác minh chữ ký từ VNPay
    const verify = vnpay.verifyIpnCall(queryParams as unknown as VerifyIpnCall);

    // Kiểm tra chữ ký có hợp lệ không
    if (!verify.isVerified) {
      console.log("❌ IPN thất bại: Chữ ký không hợp lệ");
      return NextResponse.json(IpnFailChecksum);
    }

    const txnRef = verify.vnp_TxnRef;

    // ⭐ Kiểm tra xem đây là Premium payment hay Course enrollment
    if (txnRef.startsWith("PREMIUM_")) {
      return handlePremiumPayment(txnRef, verify);
    } else {
      return handleCourseEnrollment(txnRef, verify);
    }
  } catch (error) {
    console.error("Lỗi xử lý IPN:", error);
    return NextResponse.json(IpnUnknownError);
  }
}

// Handle Premium AI subscription payment
async function handlePremiumPayment(txnRef: string, verify: VerifyIpnCall) {
  const paymentId = txnRef.replace("PREMIUM_", "");
  
  const payment = await prisma.thanhToanPremium.findUnique({
    where: { id: paymentId },
    include: { 
      nguoiDung: { 
        select: { 
          id: true,
          name: true, 
          email: true,
          isPremium: true,
          premiumExpires: true
        } 
      } 
    }
  });

  if (!payment) {
    console.log("IPN thất bại: Không tìm thấy thanh toán Premium:", paymentId);
    return NextResponse.json(IpnOrderNotFound);
  }

  // Handle failed/cancelled payment
  if (!verify.isSuccess) {
    console.log("IPN: Thanh toán Premium thất bại hoặc bị hủy");
    
    await prisma.thanhToanPremium.update({
      where: { id: paymentId },
      data: {
        trangThai: "DaHuy",
        vnpTxnRef: txnRef,
        vnpTransactionNo: verify.vnp_TransactionNo?.toString(),
        vnpBankCode: verify.vnp_BankCode
      }
    });

    return NextResponse.json(IpnSuccess);
  }

  // Check amount
  if (verify.vnp_Amount !== payment.soTien) {
    console.log("IPN thất bại: Số tiền không khớp", {
      vnpayAmount: verify.vnp_Amount,
      paymentAmount: payment.soTien
    });
    return NextResponse.json(IpnInvalidAmount);
  }

  // Check if already confirmed
  if (payment.trangThai === "DaThanhToan") {
    console.log("IPN: Thanh toán Premium đã được xác nhận trước đó");
    return NextResponse.json(InpOrderAlreadyConfirmed);
  }

  // Calculate new expiry date
  const now = new Date();
  const user = payment.nguoiDung;
  
  // If currently premium and not expired, extend from expiry date
  // Otherwise start from now
  const startDate = (user.isPremium && user.premiumExpires && user.premiumExpires > now)
    ? user.premiumExpires
    : now;
  
  const newExpiry = new Date(startDate);
  newExpiry.setDate(newExpiry.getDate() + payment.soNgay);

  // Update payment and user in transaction
  await prisma.$transaction([
    prisma.thanhToanPremium.update({
      where: { id: paymentId },
      data: {
        trangThai: "DaThanhToan",
        vnpTxnRef: txnRef,
        vnpTransactionNo: verify.vnp_TransactionNo?.toString(),
        vnpBankCode: verify.vnp_BankCode
      }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: true,
        premiumExpires: newExpiry
      }
    })
  ]);

  console.log("✅ IPN Premium thành công:", {
    paymentId,
    userId: user.email,
    amount: payment.soTien,
    days: payment.soNgay,
    newExpiry: newExpiry.toISOString(),
    transactionNo: verify.vnp_TransactionNo,
    bankCode: verify.vnp_BankCode
  });

  return NextResponse.json(IpnSuccess);
}

// Handle Course enrollment payment (existing logic)
async function handleCourseEnrollment(enrollmentId: string, verify: VerifyIpnCall) {
  const foundDangKy = await prisma.dangKyHoc.findUnique({
    where: { id: enrollmentId },
    include: {
      khoaHoc: {
        select: {
          gia: true,
          tenKhoaHoc: true,
        },
      },
      nguoiDung: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!foundDangKy) {
    console.log("IPN thất bại: Không tìm thấy enrollment");
    return NextResponse.json(IpnOrderNotFound);
  }

  // Handle failed/cancelled payment
  if (!verify.isSuccess) {
    console.log("IPN: Thanh toán thất bại hoặc bị hủy");

    await prisma.dangKyHoc.update({
      where: { id: enrollmentId },
      data: {
        trangThai: "DaHuy",
        ngayCapNhat: new Date(),
      },
    });

    console.log("Đã cập nhật enrollment thành DaHuy:", enrollmentId);
    return NextResponse.json(IpnSuccess);
  }

  // Check amount
  if (verify.vnp_Amount !== foundDangKy.soTien) {
    console.log("IPN thất bại: Số tiền không khớp", {
      vnpayAmount: verify.vnp_Amount,
      enrollmentAmount: foundDangKy.soTien,
    });
    return NextResponse.json(IpnInvalidAmount);
  }

  // Check if already confirmed
  if (foundDangKy.trangThai === "DaThanhToan") {
    console.log("IPN: Enrollment đã được xác nhận trước đó");
    return NextResponse.json(InpOrderAlreadyConfirmed);
  }

  // Update enrollment and coupon in transaction
  await prisma.$transaction(async (tx) => {
    // Calculate platform fee (5%)
    const PLATFORM_FEE_RATE = 0.05;
    const phiSan = Math.round(foundDangKy.soTien * PLATFORM_FEE_RATE);
    const thanhToanThuc = foundDangKy.soTien - phiSan;

    await tx.dangKyHoc.update({
      where: { id: enrollmentId },
      data: {
        trangThai: "DaThanhToan",
        ngayCapNhat: new Date(),
        phiSan: phiSan,
        thanhToanThuc: thanhToanThuc,
      },
    });

    if (foundDangKy.maGiamGiaId) {
      await tx.maGiamGia.update({
        where: { id: foundDangKy.maGiamGiaId },
        data: { daSuDung: { increment: 1 } }
      });
      console.log("IPN: Đã tăng số lượng coupon:", foundDangKy.maGiamGiaId);
    }
  });

  // --- NOTIFICATION TO TEACHER (Paid Enrollment) ---
  try {
     const courseWithTeacher = await prisma.khoaHoc.findUnique({
         where: { id: foundDangKy.idKhoaHoc },
         select: { idNguoiDung: true } 
     });

     if (courseWithTeacher) {
         await sendNotification({
             userId: courseWithTeacher.idNguoiDung,
             title: "Học viên mới! 💰",
             message: `Học viên ${foundDangKy.nguoiDung.name || "mới"} vừa mua khóa học "${foundDangKy.khoaHoc.tenKhoaHoc}".\nDoanh thu: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(foundDangKy.soTien)}`,
             type: "KHOA_HOC",
             metadata: {
                 type: "NEW_ENROLLMENT",
                 courseId: foundDangKy.idKhoaHoc,
                 amount: foundDangKy.soTien
             }
         });
     }
  } catch (notifyError) {
      console.error("Failed to notify teacher (IPN):", notifyError);
  }
  // ------------------------------------------------

  console.log("✅ IPN thành công: Đã cập nhật enrollment", {
    enrollmentId: foundDangKy.id,
    userId: foundDangKy.nguoiDung.email,
    courseTitle: foundDangKy.khoaHoc.tenKhoaHoc,
    amount: foundDangKy.soTien,
  });

  return NextResponse.json(IpnSuccess);
}

export async function POST(request: NextRequest) {
  return GET(request);
}