import { Skeleton } from "@/src/components/ui/skeleton"

export function TopNavSkeleton() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="hidden h-5 w-44 lg:block" />
        </div>
        <Skeleton className="hidden h-4 w-20 md:block" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="size-9 rounded-full" />
      </div>
    </header>
  )
}
