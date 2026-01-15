"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Loader2 } from "lucide-react";
import { CategoryHoverMenu } from "./CategoryHoverMenu";

interface DanhMuc {
  id: string;
  tenDanhMuc: string;
  danhMucCon?: DanhMuc[];
}

interface CapDo {
  id: string;
  tenCapDo: string;
}

interface CourseFiltersProps {
  categories: DanhMuc[];
  levels: CapDo[];
}

export function CourseFilters({ categories, levels }: CourseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current filter values from URL
  const currentKeyword = searchParams.get("q") || "";
  const currentCategory = searchParams.get("categoryId") || "";
  const currentLevel = searchParams.get("levelId") || "";

  const [keyword, setKeyword] = useState(currentKeyword);
  
  // Update URL with new params
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        router.push(`/courses?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: keyword.trim() || null });
  };

  const handleCategoryChange = (value: string) => {
    updateFilters({ categoryId: value === "all" ? null : value });
  };

  const handleLevelChange = (value: string) => {
    updateFilters({ levelId: value === "all" ? null : value });
  };

  const handleClearFilters = () => {
    setKeyword("");
    startTransition(() => {
      router.push("/courses", { scroll: false });
    });
  };

  const hasActiveFilters = currentKeyword || currentCategory || currentLevel;

  return (
    <div className="mb-6">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter - NEW CASCADING MENU */}
        <CategoryHoverMenu
          categories={categories}
          value={currentCategory}
          onChange={handleCategoryChange}
        />
        <Select
          value={currentLevel || "all"}
          onValueChange={handleLevelChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Cấp độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả cấp độ</SelectItem>
            {levels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.tenCapDo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="submit" disabled={isPending} className="shrink-0">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Tìm kiếm"
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4 mr-1" />
            Xóa bộ lọc
          </Button>
        )}
      </form>
    </div>
  );
}
