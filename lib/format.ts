import { format, isToday, isYesterday, isSameYear, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";

export const formatMessageTime = (date: Date | string) => {
  const d = new Date(date);
  const now = new Date();

  if (isToday(d)) {
    return format(d, "HH:mm");
  }
  
  if (isYesterday(d)) {
    return "Hôm qua";
  }
  
  // Within 7 days, show Day of Week (e.g., "Thứ Hai")
  if (differenceInDays(now, d) < 7) {
    return format(d, "eeee", { locale: vi });
  }

  // If different year, show full date
  if (!isSameYear(d, now)) {
    return format(d, "dd/MM/yyyy", { locale: vi });
  }

  // Otherwise (same year, > 7 days)
  return format(d, "dd/MM", { locale: vi });
};

export const formatDuration = (seconds?: number | null) => {
  // Handle null, undefined, or 0
  if (!seconds || seconds <= 0) {
    return "0p00s";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // Format with Vietnamese labels: h = giờ, p = phút, s = giây
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, "0")}p${secs.toString().padStart(2, "0")}s`;
  }
  return `${minutes}p${secs.toString().padStart(2, "0")}s`;
};

type CategoryWithParent = {
  tenDanhMuc: string;
  danhMucCha?: CategoryWithParent | null;
} | null;

export const formatCategoryPath = (
  danhMuc: CategoryWithParent,
  fallback: string | null = null
): string => {
  if (!danhMuc) {
    return fallback || "Chưa phân loại";
  }

  // Recursively build path from parent to child
  const buildPath = (category: CategoryWithParent): string[] => {
    if (!category) return [];
    const parentPath = category.danhMucCha ? buildPath(category.danhMucCha) : [];
    return [...parentPath, category.tenDanhMuc];
  };

  const path = buildPath(danhMuc);
  return path.join(" > ");
};
