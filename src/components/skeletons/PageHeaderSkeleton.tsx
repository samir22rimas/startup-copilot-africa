import { Skeleton } from "@/src/components/ui/skeleton"

export function PageHeaderSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-72 max-w-full" />
      {lines > 1 && <Skeleton className="h-4 w-full max-w-2xl" />}
      {lines > 2 && <Skeleton className="h-4 w-3/4 max-w-xl" />}
    </div>
  )
}
