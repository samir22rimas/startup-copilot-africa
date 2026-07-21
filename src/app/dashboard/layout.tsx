import { Sidebar } from "@/src/components/dashboard/Sidebar"
import { TopNav } from "@/src/components/dashboard/TopNav"
import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950 font-sans overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-zinc-900 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
