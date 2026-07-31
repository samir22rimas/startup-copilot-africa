import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Sidebar } from "@/src/components/dashboard/Sidebar"
import { TopNav } from "@/src/components/dashboard/TopNav"
import { DashboardScrollLock } from "@/src/components/dashboard/DashboardScrollLock"
import { SidebarSkeleton } from "@/src/components/skeletons/SidebarSkeleton"
import { TopNavSkeleton } from "@/src/components/skeletons/TopNavSkeleton"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { getMyStartup } from "@/src/features/business/services/startup.service"
import { getProjects } from "@/src/features/business/services/project.service"
import { getCurrentProfile } from "@/src/features/auth/services/profile.service"
import { readActiveProjectCookie, resolveActiveProject } from "@/src/lib/active-project"

async function DashboardTopNav() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const profile = await getCurrentProfile()
  const userDisplayName =
    profile?.full_name || user.user_metadata?.full_name || user.email || "User"
  const userInitial = (userDisplayName[0] || "U").toUpperCase()

  return (
    <TopNav
      user={{
        avatarUrl: profile?.avatar_url || undefined,
        initial: userInitial,
        name: userDisplayName,
      }}
    />
  )
}

async function DashboardSidebar() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const startup = await getMyStartup()
  const projects = startup ? await getProjects(startup.id) : []
  const preferredId = await readActiveProjectCookie()
  const activeProjectId =
    projects.length > 0 ? resolveActiveProject(projects, preferredId).id : null

  return (
    <Sidebar
      activeProjectId={activeProjectId}
      projects={projects.map((project) => ({
        id: project.id,
        title: project.title,
      }))}
    />
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans">
      <DashboardScrollLock />
      <Suspense fallback={<TopNavSkeleton />}>
        <DashboardTopNav />
      </Suspense>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <Suspense fallback={<SidebarSkeleton />}>
          <DashboardSidebar />
        </Suspense>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-muted/40 p-3 sm:p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
