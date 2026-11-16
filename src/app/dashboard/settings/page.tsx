import { getCurrentProfile } from "@/src/features/auth/services/profile.service"
import { getPlanUsage } from "@/src/app/actions/settings"
import { getStartupBrandColor } from "@/src/lib/brand-theme"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { canManageStartup, getActiveStartupAccess } from "@/src/lib/workspace-access"
import { SettingsForm } from "./SettingsForm"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const [profile, access, planUsage] = await Promise.all([
    getCurrentProfile(),
    getActiveStartupAccess(),
    getPlanUsage(),
  ])
  const startup = "error" in access ? null : access.startup
  const canEditStartup = "error" in access ? false : canManageStartup(access.role)

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Account Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your founder profile and the startup details that power Copilot advice.
        </p>
      </div>

      <SettingsForm
        canEditStartup={canEditStartup}
        planUsage={planUsage}
        user={{
          email: user.email || "",
          fullName: profile?.full_name || "",
          phone: profile?.phone || "",
          city: profile?.city || "",
          countryCode: profile?.country_code || "",
          timezone: profile?.timezone || "Africa/Casablanca",
          avatarUrl: profile?.avatar_url || "",
        }}
        startup={
          startup
            ? {
                name: startup.name,
                industry: startup.industry || "",
                city: startup.city || "",
                countryCode: startup.country_code,
                stage: startup.stage,
                budgetCurrency: startup.budget_currency || "USD",
                estimatedBudgetCents: startup.estimated_budget_cents || 0,
                description: startup.description || "",
                websiteUrl: startup.website_url || "",
                primaryColor: getStartupBrandColor(startup) || "",
              }
            : null
        }
      />
    </div>
  )
}
