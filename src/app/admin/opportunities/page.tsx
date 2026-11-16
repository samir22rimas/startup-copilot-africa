import { Compass } from "lucide-react"

import { listAdminOpportunities } from "@/src/app/actions/admin-platform"
import { OpportunityManager } from "@/src/components/admin/OpportunityManager"
import { Notice } from "@/src/components/ui/page"

export const dynamic = "force-dynamic"

export default async function AdminOpportunitiesPage() {
  const result = await listAdminOpportunities()

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <Compass className="size-7 text-primary" /> Opportunities catalogue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The verified programmes, grants, competitions and events founders can browse and track.
        </p>
      </div>
      {result.success ? (
        <OpportunityManager initial={result.opportunities} />
      ) : (
        <Notice tone="warning" title="Unavailable">
          {result.error}
        </Notice>
      )}
    </div>
  )
}
