import { Skeleton } from "@/src/components/ui/skeleton"
import { PageHeaderSkeleton } from "./PageHeaderSkeleton"
import { KpiCardsSkeleton } from "./KpiCardsSkeleton"

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-7 pb-8">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton count={4} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="mb-4 h-6 w-52" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
