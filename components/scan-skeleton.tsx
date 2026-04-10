'use client';

// components/scan-skeleton.tsx
// Loading skeleton shown while the risk engine is processing.

import { Skeleton } from '@/components/ui/skeleton';

export function ScanSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Gauge + Info */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
        {/* Gauge skeleton */}
        <div className="flex justify-center">
          <Skeleton className="w-48 h-48 rounded-full" />
        </div>

        {/* Token info skeleton */}
        <div className="space-y-4 rounded-lg border border-[#262626] bg-[#111111] p-5">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      {/* Audit trail skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
