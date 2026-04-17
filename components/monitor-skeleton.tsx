'use client';

// components/monitor-skeleton.tsx
// Loading skeleton for the Monitor page data panels.

import { Skeleton } from '@/components/ui/skeleton';

export function MonitorSkeleton() {
  return (
    <div className="space-y-5 animate-page-enter" role="status" aria-label="Loading monitor data">
      {/* Fee Dispatch Progress Skeleton */}
      <div className="rounded-xl border border-[#262626] bg-[#111111] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 space-y-2">
            <Skeleton className="h-2 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 space-y-2">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-2 w-6" />
            <Skeleton className="h-2 w-6" />
            <Skeleton className="h-2 w-6" />
            <Skeleton className="h-2 w-6" />
            <Skeleton className="h-2 w-8" />
          </div>
        </div>
      </div>

      {/* Sniper Alert Zone Skeleton */}
      <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* AI Recommendation Skeleton */}
      <div className="rounded-xl border border-[#262626] bg-[#111111] p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>

      <span className="sr-only">Loading monitor data...</span>
    </div>
  );
}
