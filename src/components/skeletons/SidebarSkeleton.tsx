import { Skeleton } from "@/src/components/ui/skeleton"

export function SidebarSkeleton() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:flex">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-4 flex-1" style={{ maxWidth: `${50 + (i % 3) * 15}%` }} />
          </div>
        ))}
      </nav>
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </aside>
  )
}
