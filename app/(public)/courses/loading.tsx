import { Skeleton } from "@/components/ui/skeleton";

export default function CoursesLoading() {
  return (
    <div className="mt-5">
      {/* Header Skeleton */}
      <div className="flex flex-col space-y-2 mb-6">
        <Skeleton className="h-10 w-[400px]" />
        <Skeleton className="h-5 w-[500px]" />
      </div>

      {/* Filters Skeleton */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
          <Skeleton className="flex-1 min-w-[280px] h-10" />
          <Skeleton className="w-[220px] h-10" />
          <Skeleton className="w-[160px] h-10" />
          <Skeleton className="w-[100px] h-10" />
        </div>
        <div className="flex justify-center sm:justify-start">
          <Skeleton className="w-[300px] h-10 rounded-xl" />
        </div>
      </div>

      {/* Course Cards Skeleton - 6 cards (3x2 grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card overflow-hidden">
            {/* Image skeleton */}
            <Skeleton className="h-48 w-full" />
            
            {/* Content skeleton */}
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <Skeleton className="h-5 w-[200px]" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}
