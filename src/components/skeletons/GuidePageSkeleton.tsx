import { Skeleton } from "@/src/components/ui/skeleton"

export function GuidePageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      <div className="rounded-3xl bg-zinc-200 p-8 dark:bg-zinc-800">
        <Skeleton className="mb-3 h-4 w-48 bg-zinc-300 dark:bg-zinc-700" />
        <Skeleton className="mb-3 h-10 w-full max-w-lg bg-zinc-300 dark:bg-zinc-700" />
        <Skeleton className="h-4 w-full max-w-2xl bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Skeleton className="mb-4 size-10 rounded-xl" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
