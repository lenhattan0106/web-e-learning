"use client";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce"; 
// Assuming hook exists based on open files metadata. 
// If not, I will implement a local debounce.
// Let's assume standard useDebounce(value, delay) signature.

export const SearchInput = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const [value, setValue] = useState(searchParams.get("query") || "");
  const debouncedValue = useDebounce(value, 500);

  useEffect(() => {
    const currentQuery = searchParams.get("query");
    
    // Check if the query actually changes to avoid redundant pushes
    if (currentQuery === debouncedValue || (currentQuery === null && debouncedValue === "")) {
        return;
    }

    const params = new URLSearchParams(searchParams);
    if (debouncedValue) {
      params.set("query", debouncedValue);
    } else {
      params.delete("query");
    }
    // Reset page when searching
    params.delete("page");
    
    router.push(`${pathname}?${params.toString()}`);
  }, [debouncedValue, router, pathname, searchParams]);

  return (
    <div className="relative w-full lg:w-[360px]">
      <Input
        placeholder="Tìm kiếm coupon..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};
