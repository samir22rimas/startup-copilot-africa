import { Skeleton } from "@/src/components/ui/skeleton"
import { PageHeaderSkeleton } from "./PageHeaderSkeleton"
import { KpiCardsSkeleton } from "./KpiCardsSkeleton"

export function GenericWorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-8">
      <PageHeaderSkeleton />

      <KpiCardsSkeleton count={3} />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-4 h-10 w-36 rounded-xl" />
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-5 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
