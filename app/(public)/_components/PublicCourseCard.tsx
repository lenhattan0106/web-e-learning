import { CourseWithOwnership } from "@/app/data/course/get-all-courses-with-ownership";
import { formatDuration, formatCategoryPath } from "@/lib/format";
import { checkIfCourseBought } from "@/app/data/user/user-is-enrolled";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { School2, Star, TimerIcon, User, FileEdit, Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { env } from "@/lib/env";

// Helper to calculate average rating
function calculateAverageRating(ratings: { diemDanhGia: number }[] | undefined) {
  if (!ratings || ratings.length === 0) return { average: 0, total: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.diemDanhGia, 0);
  return { average: sum / ratings.length, total: ratings.length };
}

type Role = "user" | "teacher" | "admin";

interface iAppProps {
  data: CourseWithOwnership;
  isOwner?: boolean;
  userRole?: Role;
}

export async function PublicCourseCard({ data, isOwner = false, userRole }: iAppProps) {
  const isEnrolled = await checkIfCourseBought(data.id);
  // Calculate average rating from danhGias
  const ratingData = calculateAverageRating(data.danhGias);

  return (
    <Card className="group relative py-0 gap-0 flex flex-col h-full">
      {isOwner && (
        <Badge variant="secondary" className="absolute top-2 left-2 z-20 rounded flex items-center gap-1 bg-yellow-500/90 text-white border-0">
          <Crown className="h-3 w-3" />
          Khóa học của bạn
        </Badge>
      )}
      <Badge className="absolute top-2 right-2 z-10 rounded">
        {data.capDo}
      </Badge>
      <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
        <Image
          width={600}
          height={400}
          className="w-full h-full object-cover"
          src={`https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${data.tepKH}`}
          alt="Ảnh khóa học"
        />
      </div>
      <CardContent className="p-4 flex flex-col flex-1">
        <Link
          className="font-medium text-lg line-clamp-2 hover:underline group-hover:text-primary transition-colors min-h-[3.5rem]"
          href={`/courses/${data.duongDan}`}
        >
          {data.tenKhoaHoc}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground leading-tight mt-2 min-h-[2.5rem]">
          {data.moTaNgan}
        </p>
        {/* Teacher info - positioned separately */}
        <div className="flex items-center gap-x-2 mt-3">
          {data.nguoiDung?.image ? (
            <Image
              src={data.nguoiDung.image}
              alt={data.nguoiDung.name || "Giảng viên"}
              width={24}
              height={24}
              className="rounded-full object-cover"
            />
          ) : (
            <User className="size-6 p-1 rounded-full text-primary bg-primary/10" />
          )}
          <p className="text-sm text-muted-foreground">
            {data.nguoiDung?.name || "Giảng viên ẩn danh"}
          </p>
        </div>
      
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-x-4">
            <div className="flex items-center gap-x-2">
              <TimerIcon className="size-6 p-1 rounded-md text-primary bg-primary/10" />
              <p className="text-sm text-muted-foreground">{formatDuration(data.thoiLuong)}</p>
            </div>
            <div className="flex items-center gap-x-2">
              <School2 className="size-6 p-1 rounded-md text-primary bg-primary/10" />
              <p className="text-sm text-muted-foreground">{formatCategoryPath(data.danhMucRef, data.danhMuc)}</p>
            </div>
          </div>
          {ratingData.total > 0 && (
            <div className="flex items-center gap-x-1">
              <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
              <span className="text-sm font-medium">{ratingData.average.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({ratingData.total})</span>
            </div>
          )}
        </div>
        {/* Action Button - Show details for everyone, including owners */}
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 mb-4">
            {isEnrolled ? (
              <>
                <span className="text-lg font-medium">Giá:</span>
                <span className="text-xl font-bold text-primary">
                  Đã mua
                </span>
              </>
            ) : (
              <>
                <span className="text-lg font-medium">Giá:</span>
                <span className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(data.gia)}
                </span>
              </>
            )}
          </div>
          <Link
            href={`/courses/${data.duongDan}`}
            className={buttonVariants({
              className: "w-full",
            })}
          >
            {isEnrolled ? "Xem khóa học của bạn" : "Xem chi tiết"}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function PublicCourseCardSkeleton() {
  return (
    <Card className="group relative py-0 gap-0">
      <div className="absolute top-2 right-2 z-10 flex items-center">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="w-full relative h-fit">
        <Skeleton className="w-full rounded-t-xl aspect-video" />
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="mt-4 flex items-center gap-x-5">
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center gap-x-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
        <Skeleton className="mt-4 w-full h-10 rounded-md" />
      </CardContent>
    </Card>
  );
}
