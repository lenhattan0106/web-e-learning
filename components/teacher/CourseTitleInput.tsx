"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CourseTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  excludeTitle?: string; // <-- new optional prop: tiêu đề cần loại trừ (ví dụ khi edit)
}

export function CourseTitleInput({
  value,
  onChange,
  placeholder = "Tiêu đề khóa học",
  excludeTitle,
}: CourseTitleInputProps) {
  const [allTitles, setAllTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTitles = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/teacher/course-titles");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data)) {
          // Fix: API returns { id, title }[], need to map to strings or handle objects
          // Assuming we just need titles for uniqueness check
          const titles = data.map((item: any) => item.title || item); // Handle both for safety
          setAllTitles(titles);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchTitles();
    return () => {
      isMounted = false;
    };
  }, []);

  const suggestions = useMemo(() => {
    if (!value) return [];
    const lower = value.toLowerCase();
    return allTitles.filter((title) =>
      title.toLowerCase().includes(lower)
    );
  }, [allTitles, value]);

  const normalizedValue = value?.trim().toLowerCase() ?? "";
  const normalizedExclude = excludeTitle?.trim().toLowerCase() ?? "";

  const isDuplicate =
    !!value &&
    allTitles.some((title) => {
      const normalized = title.trim().toLowerCase();
      if (normalized === normalizedExclude) return false; // ignore chính tiêu đề đang edit
      return normalized === normalizedValue;
    });

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onBlur={() => {
          // Delay closing to allow clicking on suggestions
          setTimeout(() => setIsOpen(false), 200);
        }}
        className={cn(isDuplicate && "border-destructive ")}
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2">
          <div className="p-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-b">
            Các tiêu đề đã tồn tại (Nhấn để chọn kiểm tra):
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {suggestions.map((title) => (
              <button
                key={title}
                type="button"
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                )}
                onClick={() => {
                  onChange(title);
                  setIsOpen(false);
                }}
              >
                {title}
              </button>
            ))}
          </div>
        </div>
      )}

      {isDuplicate && (
        <div className="mt-2 flex items-center gap-2 text-sm text-destructive animate-in slide-in-from-top-1 fade-in-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-circle-alert"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <p>Tiêu đề này đã được sử dụng. Vui lòng đặt tên khác.</p>
        </div>
      )}
    </div>
  );
}


