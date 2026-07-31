import { Skeleton } from "@/src/components/ui/skeleton"
import { TaskListSkeleton } from "@/src/components/dashboard/TaskListSkeleton"

export function DashboardOverviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 sm:space-y-8">
      {/* Header banner */}
      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-11 w-36 shrink-0 rounded-xl" />
      </div>

      {/* Progress & metrics */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl bg-zinc-200 p-6 dark:bg-zinc-800 lg:col-span-7 sm:p-8">
          <div className="space-y-4">
            <Skeleton className="size-10 rounded-xl bg-zinc-300 dark:bg-zinc-700" />
            <Skeleton className="h-6 w-48 bg-zinc-300 dark:bg-zinc-700" />
            <Skeleton className="h-4 w-full max-w-sm bg-zinc-300 dark:bg-zinc-700" />
            <Skeleton className="h-3 w-full rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Skeleton className="mb-3 h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* Tasks & recommendations grid */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <TaskListSkeleton />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="mt-1 h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>

      {/* Copilot chat */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-3">
          <Skeleton className="ml-auto h-12 w-3/4 rounded-2xl rounded-tr-sm" />
          <Skeleton className="h-16 w-4/5 rounded-2xl rounded-tl-sm" />
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
