import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import NewCouponForm from "./_components/NewCouponForm";

const page = () => {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/teacher/coupon"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-bold">Tạo mới mã giảm giá</h1>
      </div>

      <NewCouponForm />
    </div>
  );
};

export default page;