"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { getTeacherCourseTitles } from "@/app/teacher/courses/create/action";
import { Skeleton } from "@/components/ui/skeleton";

interface CourseTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  excludeTitle?: string;
}

export function CourseTitleInput({
  value,
  onChange,
  placeholder = "Tiêu đề khóa học",
  excludeTitle,
}: CourseTitleInputProps) {
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [similarTitles, setSimilarTitles] = useState<string[]>([]);

  useEffect(() => {
    const fetchTitles = async () => {
      try {
        const titles = await getTeacherCourseTitles();
        setExistingTitles(titles);
      } catch (error) {
        console.error("Failed to fetch course titles", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTitles();
  }, []);

  useEffect(() => {
    if (loading || !value || value.trim().length < 3) {
      setIsDuplicate(false);
      setSimilarTitles([]);
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    const normalizedExclude = excludeTitle?.trim().toLowerCase();

    // If matches excludeTitle (self), it's valid
    if (normalizedExclude && normalizedValue === normalizedExclude) {
      setIsDuplicate(false);
      setSimilarTitles([]);
      return;
    }

    // Check for exact duplicate (case-insensitive)
    const duplicate = existingTitles.some(
      (t) => t.trim().toLowerCase() === normalizedValue
    );
    setIsDuplicate(duplicate);

    // Find similar titles (partial match)
    if (!duplicate) {
      const similar = existingTitles
        .filter((t) => t.toLowerCase().includes(normalizedValue))
        .slice(0, 3); // Show max 3 similar titles
      setSimilarTitles(similar);
    } else {
      setSimilarTitles([]);
    }
  }, [value, existingTitles, excludeTitle, loading]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "transition-colors",
          isDuplicate && "border-destructive focus-visible:ring-destructive"
        )}
      />

      {/* Feedback Area */}
      <div className="min-h-[20px]">
        {value.trim().length < 3 && value.trim().length > 0 && (
          <p className="text-sm text-muted-foreground">
            Nhập ít nhất 3 ký tự để kiểm tra tiêu đề
          </p>
        )}

        {value.trim().length >= 3 && isDuplicate && (
          <div className="flex items-start gap-2 text-sm text-destructive animate-in slide-in-from-top-1 fade-in-0">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Bạn đã có khóa học với tiêu đề này. Vui lòng chọn tiêu đề khác.</p>
          </div>
        )}

        {value.trim().length >= 3 && !isDuplicate && similarTitles.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-amber-600 animate-in slide-in-from-top-1 fade-in-0">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Bạn đã có các khóa học tương tự:</p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                {similarTitles.map((title) => (
                  <li key={title} className="truncate">
                    {title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {value.trim().length >= 3 && !isDuplicate && similarTitles.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 animate-in slide-in-from-top-1 fade-in-0">
            <Check className="h-4 w-4 flex-shrink-0" />
            <p>Tiêu đề mới và hợp lệ</p>
          </div>
        )}
      </div>
    </div>
  );
}
