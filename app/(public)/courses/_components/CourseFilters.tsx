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

  // Flatten nested categories for select
  const flattenCategories = (cats: DanhMuc[], prefix = ""): { id: string; label: string }[] => {
    const result: { id: string; label: string }[] = [];
    cats.forEach((cat) => {
      const label = prefix ? `${prefix} > ${cat.tenDanhMuc}` : cat.tenDanhMuc;
      result.push({ id: cat.id, label });
      if (cat.danhMucCon && cat.danhMucCon.length > 0) {
        result.push(...flattenCategories(cat.danhMucCon, label));
      }
    });
    return result;
  };

  const flatCategories = flattenCategories(categories);

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

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: keyword.trim() || null });
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    updateFilters({ categoryId: value === "all" ? null : value });
  };

  // Handle level change
  const handleLevelChange = (value: string) => {
    updateFilters({ levelId: value === "all" ? null : value });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setKeyword("");
    startTransition(() => {
      router.push("/courses", { scroll: false });
    });
  };

  const hasActiveFilters = currentKeyword || currentCategory || currentLevel;

  return (
    <div className="mb-6">
      {/* All filters in one row */}
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

        {/* Category Filter */}
        <Select
          value={currentCategory || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {flatCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Level Filter */}
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

        {/* Search Button */}
        <Button type="submit" disabled={isPending} className="shrink-0">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Tìm kiếm"
          )}
        </Button>

        {/* Clear Filters Button */}
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
