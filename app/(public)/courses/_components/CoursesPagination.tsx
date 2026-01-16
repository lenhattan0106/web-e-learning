"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface CoursesPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCourses: number;
}

export function CoursesPagination({ 
  currentPage, 
  totalPages, 
  totalCourses 
}: CoursesPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tạo URL với page mới, giữ nguyên các filters khác
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  //  1 ... 4 5 6 ... 100
  const getVisiblePages = () => {
    const delta = 1; 
    const range: (number | "ellipsis")[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta) 
      ) {
        range.push(i);
      } else if (
        (i === currentPage - delta - 1 && i > 1) ||
        (i === currentPage + delta + 1 && i < totalPages)
      ) {
        range.push("ellipsis");
      }
    }
    
    return range.filter((item, index, arr) => 
      item !== "ellipsis" || arr[index - 1] !== "ellipsis"
    );
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        Hiển thị trang <strong>{currentPage}</strong> / {totalPages} ({totalCourses} khóa học)
      </p>

      {/* Pagination controls */}
      <Pagination className="order-1 sm:order-2 w-auto mx-0">
        <PaginationContent>
          {/* Previous */}
          <PaginationItem>
            <PaginationPrevious
              href={createPageUrl(currentPage - 1)}
              aria-disabled={currentPage <= 1}
              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>

          {/* Page numbers with ellipsis */}
          {visiblePages.map((page, index) => (
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  href={createPageUrl(page)}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          ))}

          {/* Next */}
          <PaginationItem>
            <PaginationNext
              href={createPageUrl(currentPage + 1)}
              aria-disabled={currentPage >= totalPages}
              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
