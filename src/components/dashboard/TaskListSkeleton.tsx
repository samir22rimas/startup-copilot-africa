import { Skeleton } from "@/src/components/ui/skeleton"

export function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
        >
          <Skeleton className="h-5 w-5 rounded-md shrink-0" />
          <Skeleton className="h-4 flex-1" style={{ maxWidth: `${60 + i * 8}%` }} />
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}