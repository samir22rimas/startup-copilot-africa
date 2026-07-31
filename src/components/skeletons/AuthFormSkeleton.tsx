import { Skeleton } from "@/src/components/ui/skeleton"

export function AuthFormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <Skeleton className="mx-auto h-8 w-48 lg:mx-0" />
        <Skeleton className="mx-auto h-4 w-64 lg:mx-0" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <Skeleton className="mx-auto h-4 w-48" />
    </div>
  )
}

export function AuthPageSkeleton() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">
      <div className="hidden w-1/2 bg-zinc-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <Skeleton className="h-6 w-48 bg-zinc-700" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full max-w-lg bg-zinc-700" />
          <Skeleton className="h-12 w-3/4 bg-zinc-700" />
        </div>
        <Skeleton className="h-32 w-full max-w-lg rounded-2xl bg-zinc-800" />
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 sm:px-12 lg:px-24">
        <AuthFormSkeleton />
      </div>
    </div>
  )
}
