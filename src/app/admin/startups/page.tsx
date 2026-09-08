import { getAdminStartupsList } from "@/src/app/actions/admin"
import { StartupManagementTable } from "@/src/components/admin/StartupManagementTable"
import { Building2 } from "lucide-react"

export default async function AdminStartupsPage() {
  const res = await getAdminStartupsList()

  if (!res.success) {
    return (
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
        <h2 className="font-bold text-lg">Error loading Startups</h2>
        <p className="text-sm mt-1">{res.error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <Building2 className="w-7 h-7 text-blue-600" /> Startup Portfolio
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Complete inventory of registered startups, owner profiles, country locations, growth stages, and onboarding progress.
        </p>
      </div>

      <StartupManagementTable initialStartups={res.startups} />
    </div>
  )
}
