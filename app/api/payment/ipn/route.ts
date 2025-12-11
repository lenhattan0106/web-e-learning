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

    // Tìm enrollment trong database
    const enrollmentId = verify.vnp_TxnRef;
    const foundEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          select: {
            price: true,
            title: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Kiểm tra enrollment có tồn tại không
    if (!foundEnrollment) {
      console.log("IPN thất bại: Không tìm thấy enrollment");
      return NextResponse.json(IpnOrderNotFound);
    }

    // ⭐ XỬ LÝ TRƯỜNG HỢP THẤT BẠI/HỦY
    if (!verify.isSuccess) {
      console.log("IPN: Thanh toán thất bại hoặc bị hủy");

      // Cập nhật enrollment thành "DaHuy"
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: "DaHuy",
          updatedAt: new Date(),
        },
      });

      console.log("Đã cập nhật enrollment thành DaHuy:", enrollmentId);
      return NextResponse.json(IpnSuccess); // Vẫn trả success cho VNPay
    }

    // Kiểm tra số tiền có khớp không
    if (verify.vnp_Amount !== foundEnrollment.amount) {
      console.log("IPN thất bại: Số tiền không khớp", {
        vnpayAmount: verify.vnp_Amount,
        enrollmentAmount: foundEnrollment.amount,
      });
      return NextResponse.json(IpnInvalidAmount);
    }

    // Kiểm tra enrollment đã được xác nhận chưa
    if (foundEnrollment.status === "DaThanhToan") {
      console.log("IPN: Enrollment đã được xác nhận trước đó");
      return NextResponse.json(InpOrderAlreadyConfirmed);
    }

    // Cập nhật enrollment status thành "DaThanhToan"
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "DaThanhToan",
        updatedAt: new Date(),
      },
    });

    console.log("IPN thành công: Đã cập nhật enrollment", {
      enrollmentId: foundEnrollment.id,
      userId: foundEnrollment.user.email,
      courseTitle: foundEnrollment.course.title,
      amount: foundEnrollment.amount,
      transactionNo: verify.vnp_TransactionNo,
      bankCode: verify.vnp_BankCode,
    });

    return NextResponse.json(IpnSuccess);
  } catch (error) {
    console.error("Lỗi xử lý IPN:", error);
    return NextResponse.json(IpnUnknownError);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}