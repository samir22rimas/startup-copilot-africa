import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Sidebar, type SidebarProps } from "@/src/components/dashboard/Sidebar"
import { TopNav } from "@/src/components/dashboard/TopNav"
import { DashboardScrollLock } from "@/src/components/dashboard/DashboardScrollLock"
import { SidebarSkeleton } from "@/src/components/skeletons/SidebarSkeleton"
import { TopNavSkeleton } from "@/src/components/skeletons/TopNavSkeleton"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { getAllMyStartups } from "@/src/features/business/services/startup.service"
import { getCurrentProfile } from "@/src/features/auth/services/profile.service"
import { readActiveStartupCookie, resolveActiveStartup } from "@/src/lib/active-startup"
import { FeedbackModal } from "@/src/components/shared/FeedbackModal"
import { isPlatformAdmin } from "@/src/lib/admin-guard"
import { getStartupBrandColor } from "@/src/lib/brand-theme"
import { getPlanLimits, getPlanTier } from "@/src/lib/plans"
import { getMonthlyAiUsage } from "@/src/lib/rate-limiter"
import { BrandThemeProvider } from "@/src/providers/brand-theme-provider"

async function loadShell(): Promise<{
  sidebar: SidebarProps
  user: { avatarUrl?: string; initial: string; name: string; email?: string }
  plan: { tier: string; used: number; limit: number }
  primaryColor?: string | null
}> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const [profile, startups, preferredId, used] = await Promise.all([
    getCurrentProfile(),
    getAllMyStartups(),
    readActiveStartupCookie(),
    getMonthlyAiUsage(user.id),
  ])
  const active = startups.length ? resolveActiveStartup(startups, preferredId) : null
  const name = profile?.full_name || user.user_metadata?.full_name || user.email || "User"
  const tier = getPlanTier(user)
  const primaryColor = getStartupBrandColor(active)

  return {
    sidebar: {
      startups: startups.map((s) => ({
        id: s.id,
        name: s.name,
        primaryColor: getStartupBrandColor(s),
      })),
      activeStartupId: active?.id ?? null,
      stage: active?.stage ?? null,
      isAdmin: isPlatformAdmin(user),
    },
    user: {
      avatarUrl: profile?.avatar_url || undefined,
      initial: (String(name)[0] || "U").toUpperCase(),
      name: String(name),
      email: user.email ?? undefined,
    },
    plan: { tier, used, limit: getPlanLimits(tier).monthlyAiGenerations },
    primaryColor,
  }
}

async function DashboardTopNav() {
  const shell = await loadShell()
  return <TopNav user={shell.user} plan={shell.plan} sidebar={shell.sidebar} />
}

async function DashboardSidebar() {
  const shell = await loadShell()
  return <Sidebar {...shell.sidebar} />
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadShell()

  return (
    <BrandThemeProvider initialColor={shell.primaryColor}>
      <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans">
        <DashboardScrollLock />
        <Suspense fallback={<TopNavSkeleton />}>
          <DashboardTopNav />
        </Suspense>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<SidebarSkeleton />}>
            <DashboardSidebar />
          </Suspense>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-muted/30 px-4 py-5 sm:px-6 sm:py-7 lg:px-10">
            {children}
          </main>
        </div>

        <FeedbackModal />
      </div>
    </BrandThemeProvider>
  )
}
