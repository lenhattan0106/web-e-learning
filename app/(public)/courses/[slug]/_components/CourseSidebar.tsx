"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EnrollmentButton } from "./EnrollmentButton";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, Tag, X, FileEdit } from "lucide-react";
import Link from "next/link";
import { verifyCoupon } from "../_actions/coupon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CourseSidebarProps {
  courseId: string;
  price: number;
  isEnrolled: boolean;
  isOwner?: boolean;
  userRole?: "user" | "teacher" | "admin";
  children?: React.ReactNode;
}

export function CourseSidebar({
  courseId,
  price,
  isEnrolled,
  isOwner = false,
  userRole,
  children,
}: CourseSidebarProps) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;

    startTransition(async () => {
      const result = await verifyCoupon(couponCode, courseId);
      if (result.isValid) {
        if (appliedCoupon) {
            toast.success("Đã cập nhật mã giảm giá mới");
        } else {
            toast.success(result.message);
        }
        
        setAppliedCoupon({
          code: result.couponCode,
          discountAmount: result.discountAmount,
          finalPrice: result.discountedPrice,
        });
      } else {
        toast.error(result.error || "Mã giảm giá không hợp lệ");
        // Không clear mã đang nhập để user sửa
      }
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("Đã hủy áp dụng mã giảm giá");
  };

  return (
    <div className="sticky top-20">
      <Card className="py-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            {isEnrolled ? (
              <div className="text-left leading-tight w-full">
                <p className="text-md font-medium">
                  Xin chào bạn, chúc mừng bạn đã sở hữu khóa học này. Vui lòng
                  vào khu vực học tập để tiếp tục.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-4">
                {/* Price Display */}
                <div className="text-left flex items-center justify-between w-full">
                  <p className="text-lg font-medium">Giá:</p>
                  <div className="text-right">
                    {appliedCoupon ? (
                      <div className="flex flex-col items-end">
                        <p className="text-sm text-muted-foreground line-through decoration-red-500">
                          {price === 0 
                            ? "Miễn phí" 
                            : new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(price)
                          }
                        </p>
                        <p className="text-2xl font-bold text-primary animate-in fade-in zoom-in duration-300">
                          {appliedCoupon.finalPrice === 0 
                            ? "Miễn phí" 
                            : new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(appliedCoupon.finalPrice)
                          }
                        </p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-primary">
                        {price === 0 
                          ? "Miễn phí" 
                          : new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(price)
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* Coupon Input */}
                {!isEnrolled && (
                  <div className="space-y-2">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Tag className="size-4 text-green-600 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-green-700 truncate">
                              {appliedCoupon.code}
                            </span>
                            <span className="text-xs text-green-600 truncate">
                              -
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(appliedCoupon.discountAmount)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveCoupon}
                          className="h-8 w-8 text-green-700 hover:text-green-800 hover:bg-green-100"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nhập mã giảm giá..."
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="bg-white"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleApplyCoupon();
                          }}
                        />
                        <Button
                          onClick={handleApplyCoupon}
                          disabled={!couponCode || isPending}
                          variant="outline"
                          className="shrink-0"
                        >
                          {isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Áp dụng"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Section passed as children */}
          {children}

          {/* Action Button */}
          <div className="mt-6">
            {isOwner && userRole === "teacher" ? (
              <Link
                href={`/teacher/courses/${courseId}/edit`}
                className={buttonVariants({
                  className: "w-full",
                })}
              >
                <FileEdit className="mr-2 h-4 w-4" />
                Chỉnh sửa khóa học
              </Link>
            ) : isEnrolled ? (
              <EnrollmentButton courseId={courseId} isEnrolled={true} />
            ) : (
              <EnrollmentButton
                courseId={courseId}
                coursePrice={price}
                couponCode={appliedCoupon?.code}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
