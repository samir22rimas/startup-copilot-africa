import { getDashboardData } from "@/src/app/actions/dashboard"
import type { PitchDeck } from "@/src/app/actions/pitch-deck"
import { PitchDeckWorkspace } from "@/src/components/dashboard/funding/PitchDeckWorkspace"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PitchDeckPage() {
  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.startup || !data.project) redirect("/dashboard")
  const metadata = data.project.metadata && typeof data.project.metadata === "object" && !Array.isArray(data.project.metadata) ? data.project.metadata : {}
  const deck = (metadata as Record<string, unknown>).pitch_deck as PitchDeck | undefined
  return <PitchDeckWorkspace projectId={data.project.id} startupName={data.startup.name} initialDeck={deck || null} />
}
