import { Skeleton } from "@/src/components/ui/skeleton"
import { PageHeaderSkeleton } from "./PageHeaderSkeleton"

export function DocumentsPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeaderSkeleton lines={2} />
        <Skeleton className="h-10 w-40 shrink-0 rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Skeleton className="mb-3 size-10 rounded-xl" />
            <Skeleton className="mb-2 h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
