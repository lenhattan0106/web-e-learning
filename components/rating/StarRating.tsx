"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

const sizeClasses = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  const handleMouseEnter = (index: number) => {
    if (!readonly) {
      setHoverValue(index);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0);
    }
  };

  const handleClick = (index: number) => {
    if (!readonly && onChange) {
      onChange(index);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((index) => {
          const isFilled = index <= displayValue;
          const isHalf = index - 0.5 === displayValue;

          return (
            <button
              key={index}
              type="button"
              disabled={readonly}
              className={cn(
                "p-0.5 transition-transform",
                !readonly && "hover:scale-110 cursor-pointer",
                readonly && "cursor-default"
              )}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(index)}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-colors duration-200",
                  isFilled || isHalf
                    ? "fill-yellow-400 stroke-yellow-400"
                    : "fill-transparent stroke-muted-foreground/50"
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-muted-foreground ml-1">
          {value > 0 ? value.toFixed(1) : "0"}
        </span>
      )}
    </div>
  );
}

interface AverageRatingDisplayProps {
  averageRating: number;
  totalRatings: number;
  size?: "sm" | "md" | "lg";
}

export function AverageRatingDisplay({
  averageRating,
  totalRatings,
  size = "md",
}: AverageRatingDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <StarRating value={Math.round(averageRating)} readonly size={size} />
      <span className="font-semibold">
        {averageRating > 0 ? averageRating.toFixed(1) : "0"}
      </span>
      <span className="text-muted-foreground text-sm">
        ({totalRatings} đánh giá)
      </span>
    </div>
  );
}

interface RatingDistributionProps {
  distribution: Record<number, number>;
  total: number;
}

export function RatingDistribution({
  distribution,
  total,
}: RatingDistributionProps) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        return (
          <div key={star} className="flex items-center gap-2">
            <span className="w-4 text-sm font-medium">{star}</span>
            <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-10 text-sm text-muted-foreground text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
