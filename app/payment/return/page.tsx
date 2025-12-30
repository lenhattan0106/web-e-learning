import { Suspense } from "react";
import { CheckCircle, XCircle, Home, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import { vnpay } from "@/lib/vnpay";
import { type VerifyReturnUrl, parseDate } from "vnpay";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export const dynamic = "force-dynamic";

interface PaymentReturnProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Helper function để chuyển status sang tiếng Việt
function getStatusDisplay(status: string | null): { text: string; color: string } {
  switch (status) {
    case "DaThanhToan":
      return { text: "Đã thanh toán", color: "bg-green-100 text-green-700" };
    case "DaHuy":
      return { text: "Đã hủy", color: "bg-red-100 text-red-700" };
    case "DangXuLy":
      return { text: "Đang xử lý", color: "bg-yellow-100 text-yellow-700" };
    default:
      return { text: "Không xác định", color: "bg-gray-100 text-gray-700" };
  }
}

function PaymentResultSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="animate-pulse space-y-6">
          <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto"></div>
          <div className="h-8 bg-gray-200 rounded-lg w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PaymentType = "COURSE" | "PREMIUM" | "UNKNOWN";

async function PaymentResult({ searchParams }: PaymentReturnProps) {
  let verify: VerifyReturnUrl | null = null;
  let isSuccess = false;
  let hasError = false;
  let errorMessage = "";
  let displayStatus: string | null = null;
  let paymentType: PaymentType = "UNKNOWN";
  let premiumExpires: Date | null = null;
  let courseSlug: string | null = null;
  let courseName: string | null = null;

  try {
    const params = await searchParams;
    verify = vnpay.verifyReturnUrl(params as unknown as VerifyReturnUrl);
    isSuccess = verify.isVerified && verify.isSuccess;

    if (verify?.vnp_TxnRef) {
      const txnRef = verify.vnp_TxnRef;

      // ⭐ Kiểm tra xem đây là Premium hay Course
      if (txnRef.startsWith("PREMIUM_")) {
        paymentType = "PREMIUM";
        const paymentId = txnRef.replace("PREMIUM_", "");
        
        // Xử lý Premium payment
        const payment = await prisma.thanhToanPremium.findUnique({
          where: { id: paymentId },
          include: {
            nguoiDung: {
              select: {
                id: true,
                isPremium: true,
                premiumExpires: true
              }
            }
          }
        });

        if (payment) {
          if (isSuccess && payment.trangThai !== "DaThanhToan") {
            // Calculate new expiry
            const now = new Date();
            const user = payment.nguoiDung;
            const startDate = (user.isPremium && user.premiumExpires && user.premiumExpires > now)
              ? user.premiumExpires
              : now;
            
            const newExpiry = new Date(startDate);
            newExpiry.setDate(newExpiry.getDate() + payment.soNgay);
            premiumExpires = newExpiry;

            // Update in transaction
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
            displayStatus = "DaThanhToan";
          } else if (!isSuccess && payment.trangThai !== "DaHuy") {
            await prisma.thanhToanPremium.update({
              where: { id: paymentId },
              data: { trangThai: "DaHuy" }
            });
            displayStatus = "DaHuy";
          } else {
            displayStatus = payment.trangThai;
            if (payment.nguoiDung.premiumExpires) {
              premiumExpires = payment.nguoiDung.premiumExpires;
            }
          }
        }
      } else {
        paymentType = "COURSE";
        // Xử lý Course payment (logic cũ)
        const dangKyHoc = await prisma.dangKyHoc.findUnique({
          where: { id: txnRef },
          select: {
            id: true,
            trangThai: true,
            maGiamGiaId: true,
            soTien: true,
            khoaHoc: {
              select: {
                tenKhoaHoc: true,
                duongDan: true
              }
            }
          },
        });

        if (dangKyHoc) {
          courseSlug = dangKyHoc.khoaHoc.duongDan;
          courseName = dangKyHoc.khoaHoc.tenKhoaHoc;

          if (isSuccess) {
            if (dangKyHoc.trangThai !== "DaThanhToan") {
              await prisma.$transaction(async (tx) => {
                const PLATFORM_FEE_RATE = 0.05;
                const phiSan = Math.round(dangKyHoc.soTien * PLATFORM_FEE_RATE);
                const thanhToanThuc = dangKyHoc.soTien - phiSan;

                await tx.dangKyHoc.update({
                  where: { id: dangKyHoc.id },
                  data: {
                    trangThai: "DaThanhToan",
                    ngayCapNhat: new Date(),
                    phiSan,
                    thanhToanThuc,
                  },
                });

                if (dangKyHoc.maGiamGiaId) {
                  await tx.maGiamGia.update({
                    where: { id: dangKyHoc.maGiamGiaId },
                    data: { daSuDung: { increment: 1 } }
                  });
                }
              });
              displayStatus = "DaThanhToan";
            } else {
              displayStatus = "DaThanhToan";
            }
          } else {
            if (dangKyHoc.trangThai !== "DaHuy") {
              await prisma.dangKyHoc.update({
                where: { id: dangKyHoc.id },
                data: {
                  trangThai: "DaHuy",
                  ngayCapNhat: new Date(),
                },
              });
              displayStatus = "DaHuy";
            } else {
              displayStatus = "DaHuy";
            }
          }
        }
      }
    }
  } catch (error) {
    hasError = true;
    errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
  }

  // Error UI
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 h-2"></div>
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Lỗi Xử Lý Thanh Toán
            </h1>
            <p className="text-gray-600 mb-2">
              Đã xảy ra lỗi khi xác minh thanh toán
            </p>
            <p className="text-sm text-red-600 mb-8">{errorMessage}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
            >
              <Home className="w-5 h-5" />
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const Icon = isSuccess ? CheckCircle : XCircle;
  const gradientColor = isSuccess
    ? "from-green-500 to-emerald-500"
    : "from-red-500 to-orange-500";
  const bgColor = isSuccess ? "bg-green-50" : "bg-red-50";
  const iconBgColor = isSuccess ? "bg-green-100" : "bg-red-100";
  const iconColor = isSuccess ? "text-green-600" : "text-red-600";

  const paymentDate = verify?.vnp_PayDate
    ? parseDate(verify.vnp_PayDate).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  const statusDisplay = getStatusDisplay(displayStatus);

  // ⭐ Render khác nhau cho Premium vs Course
  const isPremiumPayment = paymentType === "PREMIUM";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Gradient Header */}
          <div className={`bg-gradient-to-r ${gradientColor} h-2`}></div>

          {/* Status Header */}
          <div className={`${bgColor} px-8 py-10 text-center border-b`}>
            <div className="mb-6">
              <div
                className={`w-24 h-24 ${iconBgColor} rounded-full flex items-center justify-center mx-auto shadow-lg`}
              >
                <Icon className={`w-14 h-14 ${iconColor}`} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {isSuccess 
                ? (isPremiumPayment ? "Nâng cấp Premium Thành Công! 🎉" : "Thanh Toán Thành Công! 🎉")
                : "Thanh Toán Thất Bại"
              }
            </h1>
            <p className="text-gray-600 text-lg">
              {isSuccess
                ? (isPremiumPayment 
                    ? "Chào mừng bạn đến với AI Pro! Trải nghiệm chatbot không giới hạn."
                    : "Chúc mừng! Bạn đã đăng ký khóa học thành công"
                  )
                : "Giao dịch không thể hoàn thành"}
            </p>
          </div>

          {/* Success/Failure Message */}
          <div className="px-8 py-6">
            {isSuccess ? (
              isPremiumPayment ? (
                // Premium Success Message
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    <span className="font-semibold text-amber-800">Gói AI Pro đã kích hoạt!</span>
                  </div>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Bạn có thể sử dụng <strong>AI Chatbot</strong> không giới hạn để:
                  </p>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    <li>✓ Giải đáp mọi thắc mắc về khóa học</li>
                    <li>✓ Phân tích và hướng dẫn bài tập</li>
                    <li>✓ Tư vấn lộ trình học tập cá nhân</li>
                  </ul>
                  {premiumExpires && (
                    <div className="mt-4 pt-3 border-t border-amber-200">
                      <p className="text-sm text-amber-800">
                        <strong>Hiệu lực đến:</strong> {format(premiumExpires, "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Course Success Message
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <BookOpen className="w-6 h-6 text-green-600" />
                    <span className="font-semibold text-green-800">Khóa học đã được kích hoạt!</span>
                  </div>
                  {courseName && (
                    <p className="text-sm text-green-700">
                      <strong>{courseName}</strong> đã sẵn sàng trong thư viện của bạn.
                    </p>
                  )}
                </div>
              )
            ) : (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-5 mb-6">
                <p className="text-sm text-red-800 leading-relaxed">
                  ❌ <strong>Giao dịch thất bại.</strong> Vui lòng thử lại hoặc
                  liên hệ hỗ trợ nếu số tiền đã bị trừ khỏi tài khoản của bạn.
                </p>
              </div>
            )}

            {/* Transaction Details */}
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                Thông Tin Giao Dịch
              </h3>

              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                {verify?.vnp_TxnRef && (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Loại giao dịch
                    </span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${isPremiumPayment ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isPremiumPayment ? "AI Premium" : "Khóa học"}
                    </span>
                  </div>
                )}

                {verify?.vnp_Amount && (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Số tiền
                    </span>
                    <span className="text-base font-bold text-gray-900">
                      {Number(verify.vnp_Amount).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Thời gian
                  </span>
                  <span className="text-sm text-gray-900">{paymentDate}</span>
                </div>

                {verify?.vnp_BankCode && (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Ngân hàng
                    </span>
                    <span className="text-sm text-gray-900 font-semibold uppercase">
                      {verify.vnp_BankCode}
                    </span>
                  </div>
                )}

                {verify?.vnp_TransactionNo && (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">
                      Mã GD VNPay
                    </span>
                    <span className="text-sm text-gray-900 font-mono bg-white px-3 py-1 rounded-lg">
                      {verify.vnp_TransactionNo}
                    </span>
                  </div>
                )}

                {displayStatus && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Trạng thái
                    </span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${statusDisplay.color}`}>
                      {statusDisplay.text}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning if not verified */}
            {verify && !verify.isVerified && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 leading-relaxed">
                    <strong>Cảnh báo:</strong> Không thể xác minh tính toàn vẹn
                    dữ liệu. Vui lòng liên hệ bộ phận hỗ trợ.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-8 py-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              <Home className="w-5 h-5" />
              Về Trang Chủ
            </Link>
            {isSuccess && (
              isPremiumPayment ? (
                // Premium: Go to chat
                <Link
                  href="/courses"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
                >
                  <Sparkles className="w-5 h-5" />
                  Trò chuyện với AI ngay
                </Link>
              ) : (
                // Course: Go to learning
                <Link
                  href={courseSlug ? `/courses/${courseSlug}/learn` : "/courses"}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
                >
                  <BookOpen className="w-5 h-5" />
                  Vào Học Ngay
                </Link>
              )
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {isSuccess ? (
            <>
              Cần hỗ trợ?{" "}
              <Link href="/" className="text-blue-600 hover:underline">
                Liên hệ với chúng tôi
              </Link>
            </>
          ) : (
            <>
              Gặp vấn đề?{" "}
              <Link href="/" className="text-blue-600 hover:underline">
                Trung tâm hỗ trợ
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function PaymentReturnPage(props: PaymentReturnProps) {
  return (
    <Suspense fallback={<PaymentResultSkeleton />}>
      <PaymentResult {...props} />
    </Suspense>
  );
}