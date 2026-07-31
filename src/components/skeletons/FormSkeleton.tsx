import { Skeleton } from "@/src/components/ui/skeleton"

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: Math.ceil(fields / 2) }).map((_, section) => (
        <div
          key={section}
          className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Skeleton className="mb-6 h-6 w-40" />
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Skeleton className="h-11 w-32 rounded-xl" />
    </div>
  )
}
