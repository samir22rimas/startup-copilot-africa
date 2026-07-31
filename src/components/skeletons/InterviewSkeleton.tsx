import { Skeleton } from "@/src/components/ui/skeleton"

export function InterviewSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <Skeleton className="ml-auto h-14 w-4/5 rounded-2xl rounded-tr-sm" />
          <Skeleton className="h-20 w-5/6 rounded-2xl rounded-tl-sm" />
          <Skeleton className="ml-auto h-12 w-3/5 rounded-2xl rounded-tr-sm" />
          <Skeleton className="h-16 w-4/5 rounded-2xl rounded-tl-sm" />
        </div>
        <Skeleton className="mt-6 h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
