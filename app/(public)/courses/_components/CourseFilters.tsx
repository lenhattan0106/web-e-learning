"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

  const currentKeyword = searchParams.get("q") || "";
  const currentCategory = searchParams.get("categoryId") || "";
  const currentLevel = searchParams.get("levelId") || "";
  const currentTab = searchParams.get("tab") || "all";

  const [keyword, setKeyword] = useState(currentKeyword);
  const [categoryId, setCategoryId] = useState(currentCategory);
  const [levelId, setLevelId] = useState(currentLevel);
  const [activeTab, setActiveTab] = useState(currentTab);

  useEffect(() => {
    setKeyword(currentKeyword);
    setCategoryId(currentCategory);
    setLevelId(currentLevel);
    setActiveTab(currentTab);
  }, [currentKeyword, currentCategory, currentLevel, currentTab]);

  const updateUrl = (
    newParams: {
      q?: string;
      categoryId?: string;
      levelId?: string;
      tab?: string;
    },
    shouldReset: boolean = false
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (shouldReset) {
      const tab = newParams.tab || "all";
      startTransition(() => {
        router.push(`/courses?tab=${tab}`);
      });
      return;
    }

    if (newParams.q !== undefined) {
      if (newParams.q) params.set("q", newParams.q);
      else params.delete("q");
    }
    if (newParams.categoryId !== undefined) {
      if (newParams.categoryId) params.set("categoryId", newParams.categoryId);
      else params.delete("categoryId");
    }
    if (newParams.levelId !== undefined) {
      if (newParams.levelId) params.set("levelId", newParams.levelId);
      else params.delete("levelId");
    }
    if (newParams.tab !== undefined) {
      params.set("tab", newParams.tab);
    }

    startTransition(() => {
      router.push(`/courses?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateUrl({
      q: keyword.trim(),
      categoryId: categoryId === "all" ? undefined : categoryId,
      levelId: levelId === "all" ? undefined : levelId,
      tab: activeTab,
    });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    updateUrl({
        q: keyword.trim(),
        categoryId: categoryId === "all" ? undefined : categoryId,
        levelId: levelId === "all" ? undefined : levelId,
        tab: value 
    });
  };

  const handleClearFilters = () => {
    setKeyword("");
    setCategoryId("");
    setLevelId("");
    setActiveTab("all");
    updateUrl({ tab: "all" }, true);
  };

  const hasActiveFilters =
    keyword !== "" ||
    (categoryId !== "" && categoryId !== "all") ||
    (levelId !== "" && levelId !== "all");

  return (
    <div className="mb-8 space-y-6">
      {/* 1. Search Bar & Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Bạn muốn học gì hôm nay?"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10 border-slate-200 focus:border-sky-500 focus:ring-sky-500 transition-all rounded-lg"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryId || "all"} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[220px] border-slate-200 rounded-lg font-medium text-slate-700 dark:text-slate-200">
             <SelectValue placeholder="Chọn lĩnh vực" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px] p-1">
            <SelectItem value="all" className="font-semibold text-sky-700 focus:text-sky-800 focus:bg-sky-50">
              Tất cả danh mục
            </SelectItem>
            <Separator className="my-1 opacity-50" />
            
            {categories.map((parent) => (
              <SelectGroup key={parent.id}>
                {/* Parent Label */}
                <SelectLabel className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {parent.tenDanhMuc}
                </SelectLabel>
                
                {/* Parent Selectable Item */}
                <SelectItem value={parent.id} className="pl-4 font-medium text-slate-900 focus:bg-slate-50 dark:text-slate-100 dark:focus:bg-slate-800">
                  Toàn bộ {parent.tenDanhMuc}
                </SelectItem>

                {/* Children Items */}
                {parent.danhMucCon?.map((child) => (
                  <SelectItem 
                    key={child.id} 
                    value={child.id} 
                    className="pl-8 text-slate-600 focus:text-sky-700 transition-colors dark:text-slate-400 dark:focus:text-sky-400"
                  >
                    <span className="mr-2 opacity-30">—</span>
                    {child.tenDanhMuc}
                  </SelectItem>
                ))}
                <Separator className="my-1 opacity-30" />
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {/* Level Filter */}
        <Select value={levelId || "all"} onValueChange={setLevelId}>
          <SelectTrigger className="w-[160px] border-slate-200 rounded-lg">
            <SelectValue placeholder="Trình độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi cấp độ</SelectItem>
            {levels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.tenCapDo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search Button */}
        <Button 
          type="submit" 
          disabled={isPending} 
          className="shrink-0 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white px-6 shadow-md shadow-sky-100 transition-all active:scale-95 dark:shadow-none"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm kiếm"}
        </Button>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearFilters}
            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <X className="h-4 w-4 mr-1" />
            Xóa lọc
          </Button>
        )}
      </form>

      {/* 2. Tabs */}
      <div className="flex justify-center sm:justify-start">
         <Tabs value={activeTab} onValueChange={handleTabChange} className="w-fit">
            <TabsList className="bg-slate-100/80 p-1 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700">
                <TabsTrigger value="all" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md transition-all dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-sky-400">
                    Tất cả
                </TabsTrigger>
                <TabsTrigger value="free" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md transition-all dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-sky-400">
                    Miễn phí
                </TabsTrigger>
                <TabsTrigger value="purchased" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md transition-all dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-sky-400">
                    Đã sở hữu
                </TabsTrigger>
            </TabsList>
         </Tabs>
      </div>
    </div>
  );
}
