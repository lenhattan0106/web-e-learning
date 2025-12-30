"use client";

import { Sparkles, Lock, CheckCircle, Zap, Crown } from "lucide-react";
import { useTransition } from "react";
import { purchasePremiumAction } from "@/app/actions/purchase-premium";

interface PremiumPaywallProps {
  onClose?: () => void;
}

export function PremiumPaywall({ onClose }: PremiumPaywallProps) {
  const [isPending, startTransition] = useTransition();

  const handleUpgrade = () => {
    startTransition(async () => {
      await purchasePremiumAction();
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
        {/* Lock Icon */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="relative inline-block">
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mx-auto border border-amber-500/30">
              <Lock className="w-6 sm:w-7 h-6 sm:h-7 text-amber-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 sm:w-6 h-5 sm:h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-white" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-2.5 sm:mt-3 mb-1">
            Nâng cấp lên AI Pro
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Mở khóa toàn bộ sức mạnh của trợ lý AI học tập
          </p>
        </div>

        {/* Features List */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-3.5 sm:p-5 mb-3 sm:mb-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm sm:text-base font-medium">Giải đáp bài tập không giới hạn</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Hỏi bất cứ câu hỏi nào về bài học</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 sm:gap-3">
              <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm sm:text-base font-medium">Tư vấn lộ trình học tập</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Recommend khóa học phù hợp với bạn</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 sm:gap-3">
              <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm sm:text-base font-medium">Powered by Google Gemini</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">AI tiên tiến nhất hiện nay</p>
              </div>
            </div>
          </div>
        </div>

        {/* Price Card */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/30 p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Gói AI Pro</p>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white">99.000</span>
                <span className="text-slate-400 text-sm sm:text-base">đ/tháng</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-1.5">
                Chỉ <span className="text-amber-400 font-semibold">3.300đ/ngày</span>
              </p>
            </div>
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="shrink-0 px-4 sm:px-5 pb-4 sm:pb-5 pt-2">
        <button
          onClick={handleUpgrade}
          disabled={isPending}
          className="
            w-full py-3 sm:py-4 px-6
            bg-gradient-to-r from-amber-400 to-orange-500
            hover:from-amber-500 hover:to-orange-600
            disabled:from-slate-600 disabled:to-slate-700
            text-white font-semibold text-sm sm:text-base
            rounded-xl
            shadow-lg shadow-amber-500/25
            hover:shadow-xl hover:shadow-amber-500/30
            disabled:shadow-none
            transition-all duration-300
            flex items-center justify-center gap-2
          "
        >
          {isPending ? (
            <>
              <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang chuyển hướng...
            </>
          ) : (
            <>
              <Zap className="w-4 sm:w-5 h-4 sm:h-5" />
              Nâng cấp ngay
            </>
          )}
        </button>

        {/* Trust Badge */}
        <p className="text-center text-xs sm:text-sm text-slate-500 mt-2 sm:mt-3">
          Thanh toán an toàn qua VNPay • Hủy bất cứ lúc nào
        </p>
      </div>
    </div>
  );
}
