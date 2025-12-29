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

export const formatDuration = (seconds?: number) => {
  if (!seconds) return "00:00:00";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [hours, minutes, secs]
    .map(val => val.toString().padStart(2, "0"))
    .join(":");
};
