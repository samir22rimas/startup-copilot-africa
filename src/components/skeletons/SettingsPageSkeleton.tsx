import { Skeleton } from "@/src/components/ui/skeleton"
import { FormSkeleton } from "./FormSkeleton"

export function SettingsPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <FormSkeleton fields={8} />
    </div>
  )
}
