"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  StarRating,
  AverageRatingDisplay,
  RatingDistribution,
} from "./StarRating";
import { submitRating } from "@/app/(public)/courses/[slug]/_actions/rating-actions";
import { env } from "@/lib/env";

// Helper to build full avatar URL from relative path
function buildAvatarUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Build full URL from relative path
  return `https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.t3.storage.dev/${imagePath}`;
}

interface RatingUser {
  id: string;
  name: string;
  image: string | null;
}

interface Rating {
  id: string;
  diemDanhGia: number;
  noiDung: string | null;
  ngayTao: Date;
  nguoiDung: RatingUser;
}

interface CourseRatingSectionProps {
  courseId: string;
  isEnrolled: boolean;
  currentUserId?: string;
  ratings: Rating[];
  averageRating: number;
  totalRatings: number;
  distribution: Record<number, number>;
  userRating?: {
    diemDanhGia: number;
    noiDung: string | null;
  } | null;
}

export function CourseRatingSection({
  courseId,
  isEnrolled,
  currentUserId,
  ratings,
  averageRating,
  totalRatings,
  distribution,
  userRating,
}: CourseRatingSectionProps) {
  const [filterStar, setFilterStar] = useState<number | null>(null);

  const filteredRatings = filterStar
    ? ratings.filter((r) => r.diemDanhGia === filterStar)
    : ratings;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-6">
          Đánh giá khóa học
        </h2>

        {/* Average Rating Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Điểm đánh giá trung bình</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold text-primary">
                  {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                </span>
                <div>
                  <StarRating value={Math.round(averageRating)} readonly size="lg" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalRatings} đánh giá
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Phân bố điểm</CardTitle>
            </CardHeader>
            <CardContent>
              <RatingDistribution distribution={distribution} total={totalRatings} />
            </CardContent>
          </Card>
        </div>

        {/* Rating Form for enrolled users */}
        {isEnrolled && currentUserId && (
          <RatingForm
            courseId={courseId}
            existingRating={userRating}
          />
        )}

        {!isEnrolled && currentUserId && (
          <Card className="mb-8 border-dashed">
            <CardContent className="py-6 text-center">
              <MessageSquare className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Bạn cần mua khóa học để có thể đánh giá và nhận xét.
              </p>
            </CardContent>
          </Card>
        )}

        <Separator className="my-8" />

        {/* Filter by stars */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium">Lọc theo:</span>
          <Badge
            variant={filterStar === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilterStar(null)}
          >
            Tất cả
          </Badge>
          {[5, 4, 3, 2, 1].map((star) => (
            <Badge
              key={star}
              variant={filterStar === star ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterStar(star)}
            >
              {star} ⭐
            </Badge>
          ))}
        </div>

        {/* Ratings List */}
        <div className="space-y-4">
          {filteredRatings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  {filterStar
                    ? `Chưa có đánh giá ${filterStar} sao nào.`
                    : "Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRatings.map((rating) => (
              <RatingItem key={rating.id} rating={rating} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface RatingFormProps {
  courseId: string;
  existingRating?: {
    diemDanhGia: number;
    noiDung: string | null;
  } | null;
}

function RatingForm({ courseId, existingRating }: RatingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(existingRating?.diemDanhGia || 0);
  const [content, setContent] = useState(existingRating?.noiDung || "");

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Vui lòng chọn số sao đánh giá");
      return;
    }

    startTransition(async () => {
      const result = await submitRating({
        idKhoaHoc: courseId,
        diemDanhGia: rating,
        noiDung: content || undefined,
      });

      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">
          {existingRating ? "Cập nhật đánh giá của bạn" : "Đánh giá khóa học"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Số sao đánh giá
          </label>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Nhận xét của bạn (tuỳ chọn)
          </label>
          <Textarea
            placeholder="Chia sẻ trải nghiệm của bạn về khóa học này..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={handleSubmit} disabled={isPending || rating === 0}>
          {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
          {existingRating ? "Cập nhật đánh giá" : "Gửi đánh giá"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface RatingItemProps {
  rating: Rating;
}

function RatingItem({ rating }: RatingItemProps) {
  const avatarUrl = buildAvatarUrl(rating.nguoiDung.image);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="relative size-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={rating.nguoiDung.name}
                fill
                className="object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="size-full flex items-center justify-center text-muted-foreground text-sm font-medium">
                {rating.nguoiDung.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{rating.nguoiDung.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(rating.ngayTao), {
                  addSuffix: true,
                  locale: vi,
                })}
              </span>
            </div>
            <StarRating value={rating.diemDanhGia} readonly size="sm" />
            {rating.noiDung && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {rating.noiDung}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
