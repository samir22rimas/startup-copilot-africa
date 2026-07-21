import { AiGenerator } from "@/src/components/dashboard/marketing/AiGenerator"
import { GrowthStrategy } from "@/src/components/dashboard/marketing/GrowthStrategy"
import { KpiCards } from "@/src/components/dashboard/marketing/KpiCards"
import { MarketingProvider } from "@/src/components/dashboard/marketing/MarketingContext"
import { SocialPlanner } from "@/src/components/dashboard/marketing/SocialPlanner"
import { UpcomingContent } from "@/src/components/dashboard/marketing/UpcomingContent"

export const dynamic = "force-dynamic"

export default function MarketingPage() {
  return (
    <MarketingProvider>
      <div className="space-y-7 pb-8">
        <div>
          <p className="text-sm font-semibold text-green-700">Launch & growth workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            Marketing command center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Turn your startup story into content, campaigns, and a weekly execution rhythm that fits your local market.
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
