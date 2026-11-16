import { Database } from "lucide-react"
import { redirect } from "next/navigation"

import { listIdeas } from "@/src/app/actions/ideas"
import { IdeaLab } from "@/src/components/dashboard/ideas/IdeaLab"
import { EmptyState, PageHeader, PageShell, Panel } from "@/src/components/ui/page"
import { getCurrentProfile } from "@/src/features/auth/services/profile.service"
import { getMyStartup } from "@/src/features/business/services/startup.service"
import { getAfricanCountry } from "@/src/lib/african-countries"
import { getI18n } from "@/src/lib/i18n/server"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { isPlatformSchemaReady } from "@/src/lib/workspace/schema-status"

export const dynamic = "force-dynamic"

/** The Idea Lab belongs to the person, so it works before any business exists. */
export default async function IdeasPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { t } = await getI18n()

  if (!(await isPlatformSchemaReady())) {
    return (
      <PageShell>
        <Panel>
          <EmptyState icon={Database} title={t.common.setupTitle} description={t.common.setupBody} />
        </Panel>
      </PageShell>
    )
  }

  const [saved, startup, profile] = await Promise.all([listIdeas(), getMyStartup(), getCurrentProfile()])
  const preferred = startup?.country_code ?? profile?.country_code ?? "CM"
  const defaultCountry = getAfricanCountry(preferred) ? preferred : "CM"

  return (
    <PageShell>
      <PageHeader eyebrow={t.nav.groupDiscover} title={t.pages.ideas.title} description={t.pages.ideas.description} />
      <IdeaLab initialSaved={saved} defaultCountry={defaultCountry} hasBusiness={Boolean(startup)} />
    </PageShell>
  )
}
