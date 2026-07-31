import { Skeleton } from "@/src/components/ui/skeleton"

export function LandingPageSkeleton() {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <section className="bg-zinc-900 px-6 pb-24 pt-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 flex h-20 items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-16 rounded-xl bg-zinc-700" />
              <Skeleton className="h-6 w-52 bg-zinc-700" />
            </div>
            <div className="hidden items-center gap-4 md:flex">
              <Skeleton className="h-4 w-24 bg-zinc-700" />
              <Skeleton className="h-4 w-20 bg-zinc-700" />
              <Skeleton className="h-10 w-28 rounded-full bg-zinc-700" />
            </div>
          </div>

          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64 rounded-full bg-zinc-700" />
              <Skeleton className="h-16 w-full bg-zinc-700" />
              <Skeleton className="h-16 w-4/5 bg-zinc-700" />
              <Skeleton className="h-5 w-full max-w-xl bg-zinc-700" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-44 rounded-xl bg-zinc-700" />
                <Skeleton className="h-12 w-40 rounded-xl bg-zinc-700" />
              </div>
            </div>
            <Skeleton className="aspect-video w-full rounded-3xl bg-zinc-800" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="mb-12 h-10 w-full max-w-lg" />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Skeleton className="mb-6 size-11 rounded-2xl" />
              <Skeleton className="mb-3 h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
