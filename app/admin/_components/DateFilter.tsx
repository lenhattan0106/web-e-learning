"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface DateFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  quickDurations?: number[];
  currentDuration?: number;
  onQuickDurationChange?: (days: number) => void;
  isCustomRange?: boolean;
  className?: string;
}

const DEFAULT_QUICK_DURATIONS = [7, 30, 90];

export function DateFilter({
  dateRange,
  onDateRangeChange,
  quickDurations = DEFAULT_QUICK_DURATIONS,
  currentDuration,
  onQuickDurationChange,
  isCustomRange = false,
  className,
}: DateFilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {/* Quick Duration Buttons */}
      <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
        {quickDurations.map((days) => (
          <button
            key={days}
            onClick={() => onQuickDurationChange?.(days)}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all ${
              !isCustomRange && currentDuration === days
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {days} ngày
          </button>
        ))}
      </div>

      {/* Custom Date Range Picker */}
      <DateRangePicker
        value={dateRange}
        onChange={onDateRangeChange}
        className={isCustomRange ? "ring-2 ring-primary" : ""}
      />
    </div>
  );
}
