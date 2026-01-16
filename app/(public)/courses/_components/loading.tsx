import { PublicCourseCardSkeleton } from "../../_components/PublicCourseCard";

export default function Loading() {
  return (
    <div className="mt-5">
      <div className="flex flex-col space-y-2 mb-6">
        {/* Title skeleton */}
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-5 w-96 bg-muted animate-pulse rounded" />
      </div>

      {/* Filters skeleton */}
      <div className="mb-8 space-y-4">
         <div className="flex flex-wrap gap-3 items-center">
            <div className="h-10 w-[200px] bg-muted animate-pulse rounded" />
            <div className="h-10 w-[150px] bg-muted animate-pulse rounded" />
            <div className="h-10 w-[140px] bg-muted animate-pulse rounded" />
            <div className="h-10 w-[100px] bg-muted animate-pulse rounded" />
         </div>
         {/* Tabs skeleton */}
         <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <PublicCourseCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
