import { Skeleton } from "@/src/components/ui/skeleton"
import { PageHeaderSkeleton } from "./PageHeaderSkeleton"
import { KpiCardsSkeleton } from "./KpiCardsSkeleton"

export function MarketingPageSkeleton() {
  return (
    <div className="space-y-7 pb-8">
      <PageHeaderSkeleton lines={3} />
      <KpiCardsSkeleton />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-2 h-6 w-44" />
          <Skeleton className="mb-4 h-4 w-64" />
          <Skeleton className="mb-3 h-32 w-full rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-4 h-6 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-4 h-6 w-44" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
