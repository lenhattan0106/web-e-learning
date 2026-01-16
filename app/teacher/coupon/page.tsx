import "server-only";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma";
import { requireTeacher } from "@/app/data/teacher/require-teacher";
import { Table, TableBody, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { SearchInput } from "./_components/SearchInput";
import { CouponActions } from "./_components/CouponActions";

export default async function CouponPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireTeacher();
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const pageSize = 10;
  const skip = (page - 1) * pageSize;
  const query = typeof resolvedSearchParams.query === "string" ? resolvedSearchParams.query : "";

  // 1. Lấy danh sách ID khóa học của giáo viên
  const myCourses = await prisma.khoaHoc.findMany({
    where: { idNguoiDung: session.user.id },
    select: { id: true },
  });
  const myCourseIds = myCourses.map((c) => c.id);

  const whereClause: Prisma.maGiamGiaWhereInput = {
    AND: [
        {
            OR: [
                {
                  maGiamGiaKhoaHocs: {
                    some: {
                      khoaHocId: { in: myCourseIds },
                    },
                  },
                },
                {
                  maGiamGiaKhoaHocs: {
                    none: {},
                  },
                },
              ],
        },
        query ? {
            OR: [
                { maGiamGia: { contains: query, mode: "insensitive" } },
                { tieuDe: { contains: query, mode: "insensitive" } },
            ]
        } : {}
    ]
  };

  const [coupons, totalCoupons] = await Promise.all([
    prisma.maGiamGia.findMany({
        where: whereClause,
        include: {
          maGiamGiaKhoaHocs: {
            include: {
              khoaHoc: {
                select: { tenKhoaHoc: true },
              },
            },
          },
        },
        orderBy: { ngayTao: "desc" },
        take: pageSize,
        skip: skip,
      }),
      prisma.maGiamGia.count({ where: whereClause })
  ]);

  const totalPages = Math.ceil(totalCoupons / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý mã giảm giá</h1>
        <Link href="/teacher/coupon/create" className={buttonVariants()}>Tạo mã mới</Link>
      </div>

      <div className="mb-4">
        <SearchInput />
      </div>

      <div className="overflow-x-auto">
        <Table className="table-responsive">
            <TableHeader>
            <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead className="hidden md:table-cell">Tiêu đề</TableHead>
                <TableHead>Giảm</TableHead>
                <TableHead className="hidden lg:table-cell">Khóa học áp dụng</TableHead>
                <TableHead className="hidden md:table-cell">Đã dùng / Còn lại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {coupons.map((c) => {
                const courseNames = c.maGiamGiaKhoaHocs.map((mk) => mk.khoaHoc.tenKhoaHoc);
                const displayCourses = courseNames.length > 0 
                    ? courseNames.length > 3 
                        ? `${courseNames.slice(0, 3).join(", ")} (+${courseNames.length - 3})`
                        : courseNames.join(", ")
                    : "Toàn bộ";

                return (
                    <TableRow key={c.id}>
                    <TableCell className="font-medium whitespace-nowrap">{c.maGiamGia}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.tieuDe}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.loai === "PhanTram" ? `${c.giaTri}%` : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(c.giaTri)}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[300px] truncate" title={courseNames.join(", ")}>
                        {displayCourses}
                    </TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">
                        {c.daSuDung} / {c.soLuong}
                    </TableCell>
                    <TableCell>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.hoatDong ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                            {c.hoatDong ? "Đang hoạt động" : "Không hoạt động"}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <CouponActions id={c.id} />
                    </TableCell>
                    </TableRow>
                );
            })}
            </TableBody>
        </Table>
      </div>
      
        {totalPages > 1 && (
            <div className="flex justify-end gap-3 mt-5">
                <Link 
                    href={{ query: { ...resolvedSearchParams, page: page - 1 } }}
                    className={`${buttonVariants({ variant: "ghost", size: "icon" })} ${!hasPrevPage ? "pointer-events-none opacity-50" : ""}`}
                >
                    <IconArrowLeft />
                </Link>
                <span className="flex items-center text-sm text-gray-600">
                    Trang {page} / {totalPages}
                </span>
                <Link 
                    href={{ query: { ...resolvedSearchParams, page: page + 1 } }}
                    className={`${buttonVariants({ variant: "ghost", size: "icon" })} ${!hasNextPage ? "pointer-events-none opacity-50" : ""}`}
                >
                    <IconArrowRight />
                </Link>
            </div>
        )}
    </div>
  );
}


