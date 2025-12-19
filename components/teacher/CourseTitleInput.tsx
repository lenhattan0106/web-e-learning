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
        const data = (await res.json()) as string[];
        if (isMounted) {
          setAllTitles(data ?? []);
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
          setTimeout(() => setIsOpen(false), 120);
        }}
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-md max-h-56 overflow-auto">
          <div className="py-1 text-xs text-muted-foreground px-2">
            {isLoading ? "Đang tải gợi ý..." : ""}
          </div>
          {suggestions.map((title) => (
            <button
              key={title}
              type="button"
              className={cn(
                "block w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                onChange(title);
                setIsOpen(false);
              }}
            >
              {title}
            </button>
          ))}
        </div>
      )}

      {isDuplicate && (
        <p className="mt-1 text-xs text-destructive">
          Tiêu đề này đã tồn tại. Hãy nhập tiêu đề khác với các nội dung này.
        </p>
      )}
    </div>
  );
}


