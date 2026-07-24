import { Sidebar } from "@/src/components/dashboard/Sidebar";
import { TopNav } from "@/src/components/dashboard/TopNav";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getMyStartup } from "@/src/features/business/services/startup.service";
import { getProjects } from "@/src/features/business/services/project.service";
import { getCurrentProfile } from "@/src/features/auth/services/profile.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const profile = await getCurrentProfile();
  const startup = await getMyStartup();
  const projects = startup ? await getProjects(startup.id) : [];

  const userDisplayName = profile?.full_name || user.user_metadata?.full_name || user.email || "User";
  const userInitial = (userDisplayName[0] || "U").toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-background font-sans overflow-hidden">
      <TopNav user={{ avatarUrl: profile?.avatar_url || undefined, initial: userInitial, name: userDisplayName }} />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar projects={projects.map((project) => ({ id: project.id, title: project.title }))} />
        <main className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
