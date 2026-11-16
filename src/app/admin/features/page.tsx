import { ToggleRight } from "lucide-react"

import { listFeatureSwitches } from "@/src/app/actions/admin-platform"
import { FeatureSwitches } from "@/src/components/admin/FeatureSwitches"
import { Notice, Panel, PanelHeader } from "@/src/components/ui/page"
import { FEATURES, PLAN_LIMITS, PLAN_TIERS, planHasFeature } from "@/src/lib/plans"

export const dynamic = "force-dynamic"

export default async function AdminFeaturesPage() {
  const result = await listFeatureSwitches()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <ToggleRight className="size-7 text-primary" /> Features and plans
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch a feature off for everyone, and see what each plan includes. Plan contents are defined in{" "}
          <code>src/lib/plans.ts</code>.
        </p>
      </div>

      {result.success ? (
        <FeatureSwitches initial={result.switches} />
      ) : (
        <Notice tone="warning" title="Unavailable">
          {result.error}
        </Notice>
      )}

      <Panel className="overflow-x-auto">
        <PanelHeader title="Plan matrix" description="List prices are indicative: no payment provider is connected yet." />
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="px-5 py-2.5 font-medium">Limit / feature</th>
              {PLAN_TIERS.map((tier) => (
                <th key={tier} scope="col" className="px-5 py-2.5 font-semibold text-foreground">
                  {tier}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {(
              [
                ["AI generations / month", "monthlyAiGenerations"],
                ["Businesses", "startups"],
                ["Team seats per business", "teamSeats"],
                ["Saved ideas", "savedIdeas"],
                ["List price (USD / month)", "monthlyPriceUsd"],
              ] as const
            ).map(([label, key]) => (
              <tr key={key} className="border-b border-border">
                <th scope="row" className="px-5 py-2.5 font-normal text-muted-foreground">{label}</th>
                {PLAN_TIERS.map((tier) => (
                  <td key={tier} className="px-5 py-2.5 text-foreground">
                    {PLAN_LIMITS[tier][key].toLocaleString("en")}
                  </td>
                ))}
              </tr>
            ))}
            {FEATURES.map((feature) => (
              <tr key={feature} className="border-b border-border last:border-0">
                <th scope="row" className="px-5 py-2.5 font-mono text-xs font-normal text-muted-foreground">{feature}</th>
                {PLAN_TIERS.map((tier) => (
                  <td key={tier} className="px-5 py-2.5 text-foreground">
                    {planHasFeature(tier, feature) ? "Included" : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
