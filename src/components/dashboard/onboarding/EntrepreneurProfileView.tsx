"use client"

import { Loader2, Sparkles, UserRound } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { generateEntrepreneurProfile, type EntrepreneurProfile } from "@/src/app/actions/onboarding"
import { ReportView } from "@/src/components/reports/ReportView"
import { EmptyState, Panel, primaryButtonClass, secondaryButtonClass } from "@/src/components/ui/page"
import { useI18n } from "@/src/lib/i18n/client"

export function EntrepreneurProfileView({
  initial,
  startupName,
  canEdit,
}: {
  initial: EntrepreneurProfile | null
  startupName: string
  canEdit: boolean
}) {
  const { t } = useI18n()
  const o = t.onboarding
  const [profile, setProfile] = React.useState(initial)
  const [generating, setGenerating] = React.useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const result = await generateEntrepreneurProfile()
      if (!result.success) return void toast.error(result.error)
      setProfile(result.profile)
    } catch {
      toast.error(t.common.errorGeneric)
    } finally {
      setGenerating(false)
    }
  }

  const button = (label: string, className: string) => (
    <button type="button" onClick={generate} disabled={generating} className={className}>
      {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {generating ? t.common.generating : label}
    </button>
  )

  if (!profile) {
    return (
      <Panel>
        <EmptyState
          icon={UserRound}
          title={o.profileEmptyTitle}
          description={o.profileEmptyBody}
          action={canEdit ? button(o.profileGenerate, primaryButtonClass) : null}
        />
      </Panel>
    )
  }

  return (
    <ReportView
      report={profile.report}
      meta={profile.meta}
      startupName={startupName}
      actions={canEdit ? button(t.common.regenerate, secondaryButtonClass) : null}
    />
  )
}
