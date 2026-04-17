'use client';

// components/genesis-skeleton.tsx
// Loading skeleton for the Genesis preview card panel.

import { Skeleton } from '@/components/ui/skeleton';

export function GenesisSkeleton() {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden animate-page-enter">
      {/* Header gradient */}
      <div className="h-2 bg-gradient-to-r from-[#22c55e]/30 via-[#06b6d4]/30 to-[#8b5cf6]/30 animate-skeleton-pulse" />

      <div className="p-5 space-y-4">
        {/* Name + Symbol */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-1">
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Tax Config Grid */}
        <div>
          <Skeleton className="h-3 w-24 mb-2" />
          <div className="grid grid-cols-5 gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-md border border-[#1a1a1a] bg-[#0a0a0a] p-2">
                <Skeleton className="h-2 w-8 mx-auto mb-1" />
                <Skeleton className="h-5 w-10 mx-auto" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2 w-full rounded-full mt-2" />
        </div>

        {/* Safety Certificate */}
        <Skeleton className="h-16 w-full rounded-lg" />

        {/* Agent Score */}
        <div className="p-3 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a]">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Deploy Button */}
        <div className="border-t border-[#1a1a1a] pt-4">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
