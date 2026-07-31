import { Skeleton } from "@/src/components/ui/skeleton"

export function WizardSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <div className="mb-8 space-y-2 text-center">
        <Skeleton className="mx-auto h-9 w-72" />
        <Skeleton className="mx-auto h-4 w-96 max-w-full" />
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="mb-6 h-6 w-40" />
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <Skeleton className="h-11 w-24 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
