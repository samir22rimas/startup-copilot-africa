import { Skeleton } from "@/src/components/ui/skeleton"

export function ContentPageSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <Skeleton className="mb-2 h-10 w-64" />
        <Skeleton className="mb-10 h-4 w-40" />

        <div className="space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-4 flex items-center gap-3">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
