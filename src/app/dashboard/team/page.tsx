import { getTeamOverview } from "@/src/app/actions/team"
import { TeamWorkspace } from "@/src/components/dashboard/team/TeamWorkspace"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function TeamPage() {
  const overview = await getTeamOverview()

  if (!overview.ready) {
    // No startup yet: the dashboard walks the user through creating one.
    if (overview.reason === "no_startup") redirect("/dashboard")

    return (
      <div className="mx-auto flex h-[50vh] max-w-lg items-center justify-center text-center">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {overview.reason === "setup_required" ? "Team features need one more step" : "Team is unavailable"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{overview.message}</p>
        </div>
      </div>
    )
  }

  return <TeamWorkspace overview={overview} />
}
