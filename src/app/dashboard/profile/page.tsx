import { getEntrepreneurProfile } from "@/src/app/actions/onboarding"
import { EntrepreneurProfileView } from "@/src/components/dashboard/onboarding/EntrepreneurProfileView"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function EntrepreneurProfilePage() {
  const page = await loadWorkspacePage()
  if (!page.ok) return page.element
  const { t } = await getI18n()
  const profile = await getEntrepreneurProfile()

  return (
    <PageShell>
      <PageHeader title={t.onboarding.profileTitle} description={t.onboarding.profileDescription} />
      <EntrepreneurProfileView initial={profile} startupName={page.ws.startup.name} canEdit={page.canEdit} />
    </PageShell>
  )
}
