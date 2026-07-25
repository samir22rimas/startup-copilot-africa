import { getDashboardData } from "@/src/app/actions/dashboard"
import { AiGenerator } from "@/src/components/dashboard/marketing/AiGenerator"
import { GrowthStrategy } from "@/src/components/dashboard/marketing/GrowthStrategy"
import { KpiCards } from "@/src/components/dashboard/marketing/KpiCards"
import { MarketingProvider } from "@/src/components/dashboard/marketing/MarketingContext"
import { SocialPlanner } from "@/src/components/dashboard/marketing/SocialPlanner"
import { UpcomingContent } from "@/src/components/dashboard/marketing/UpcomingContent"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function MarketingPage() {
  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.startup || !data.project || !data.overview) {
    redirect("/dashboard")
  }

  const { marketing } = data.overview

  return (
    <MarketingProvider
      projectId={data.project.id}
      initialEvents={marketing.events}
      initialUpcoming={marketing.upcoming}
      initialKpis={marketing.kpis}
      initialStrategy={marketing.strategyItems}
    >
      <div className="space-y-7 pb-8">
        <div>
          <p className="text-sm font-semibold text-green-700">Launch &amp; growth workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            Marketing command center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            KPIs below are derived from your workspace records. Scheduled posts are tracked only after you save them —
            nothing is invented as live campaign data.
          </p>
        </div>

        <KpiCards />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <AiGenerator />
          <GrowthStrategy />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SocialPlanner />
          <UpcomingContent />
        </div>
      </div>
    </MarketingProvider>
  )
}
