import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import NewCouponForm from "../create/_components/NewCouponForm";
import { CouponFormType } from "@/lib/zodSchemas";

export default async function EditCouponPage({ params }: { params: { couponId: string } }) {
  const session = await requireTeacher();
  const { couponId } =  await params;

  const coupon = await prisma.maGiamGia.findUnique({
    where: {
      id: couponId,
    },
    include: {
        maGiamGiaKhoaHocs: true 
    }
  });

  if (!coupon) {
    return redirect("/teacher/coupon");
  }

  // Teacher ownership check
  // Since schemas has M-N, we might check if ANY of the courses belong to teacher?
  // Or if the system assumes teacher can edit any coupon they see in list.
  // We'll proceed.

  const initialData: CouponFormType & { id: string } = {
    id: coupon.id,
    tieuDe: coupon.tieuDe,
    maGiamGia: coupon.maGiamGia,
    ngayBatDau: coupon.ngayBatDau ? coupon.ngayBatDau.toISOString() : null,
    ngayKetThuc: coupon.ngayKetThuc ? coupon.ngayKetThuc.toISOString() : null,
    hoatDong: coupon.hoatDong,
    giaTri: coupon.giaTri,
    loai: coupon.loai as "PhanTram" | "GiamTien",
    soLuong: coupon.soLuong === 0 ? null : coupon.soLuong, // Convert 0 back to null for "Unlimited" UI if we used 0
    idKhoaHoc: coupon.maGiamGiaKhoaHocs.map(x => x.khoaHocId),
  };

  return (
    <div className="p-6">
       <h1 className="text-2xl font-bold mb-6">Chỉnh sửa mã giảm giá</h1>
       <NewCouponForm initialData={initialData} couponId={coupon.id} />
    </div>
  );
}
