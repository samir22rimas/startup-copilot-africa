import { Briefcase, Lightbulb, Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { BusinessSwitchButton } from "@/src/components/dashboard/businesses/BusinessSwitchButton"
import { Badge, EmptyState, PageHeader, PageShell, Panel, PanelHeader, primaryButtonClass, secondaryButtonClass } from "@/src/components/ui/page"
import { getAllMyStartups } from "@/src/features/business/services/startup.service"
import { readActiveStartupCookie, resolveActiveStartup } from "@/src/lib/active-startup"
import { getAfricanCountryName } from "@/src/lib/african-countries"
import { getCountryProfile } from "@/src/lib/country-profiles"
import type { MemberRole } from "@/src/lib/database.types"
import { fmt } from "@/src/lib/i18n/config"
import { getI18n } from "@/src/lib/i18n/server"
import { getIndustryLabel } from "@/src/lib/industries"
import { getPlanLimits, getPlanTier } from "@/src/lib/plans"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export const dynamic = "force-dynamic"

/** Every business the person belongs to, with the country context of the active one. */
export default async function BusinessesPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const { t, locale } = await getI18n()
  const b = t.businesses
  const startups = await getAllMyStartups()
  const active = startups.length ? resolveActiveStartup(startups, await readActiveStartupCookie()) : null

  const { data: memberships } = await supabase.from("startup_members").select("startup_id, role").eq("user_id", user.id)
  const roleOf = new Map((memberships ?? []).map((m) => [m.startup_id, m.role as MemberRole]))

  const tier = getPlanTier(user)
  const owned = startups.filter((s) => s.owner_id === user.id).length
  const limit = getPlanLimits(tier).startups
  const profile = active ? getCountryProfile(active.country_code) : null

  return (
    <PageShell>
      <PageHeader
        eyebrow={t.nav.groupWorkspace}
        title={t.pages.businesses.title}
        description={t.pages.businesses.description}
        actions={
          <>
            <Link href="/dashboard/ideas" className={secondaryButtonClass}>
              <Lightbulb className="size-4" /> {b.ideaLab}
            </Link>
            <Link href="/dashboard/new" className={primaryButtonClass}>
              <Plus className="size-4" /> {b.newBusiness}
            </Link>
          </>
        }
      />

      <p className="text-xs text-muted-foreground">{fmt(b.limit, { used: owned, limit, plan: tier })}</p>

      {startups.length === 0 ? (
        <Panel>
          <EmptyState icon={Briefcase} title={b.emptyTitle} description={b.emptyBody} />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {startups.map((startup) => {
            const role = roleOf.get(startup.id) ?? (startup.owner_id === user.id ? "owner" : "viewer")
            const isActive = startup.id === active?.id
            return (
              <Panel key={startup.id} as="article" className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold uppercase text-primary-foreground">
                    {startup.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-foreground">{startup.name}</h2>
                      {isActive && <Badge tone="green">{b.current}</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {startup.city ? `${startup.city}, ` : ""}
                      {getAfricanCountryName(startup.country_code)}
                      {startup.industry ? ` · ${getIndustryLabel(startup.industry)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone="brand">{t.stages[startup.stage]}</Badge>
                  <Badge>
                    {b.role}: {t.roles[role]}
                  </Badge>
                  <span>
                    {fmt(b.created, {
                      date: new Date(startup.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
                    })}
                  </span>
                </div>
                {!isActive && (
                  <div className="mt-4">
                    <BusinessSwitchButton startupId={startup.id} label={b.open} />
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}

      {active && profile && (
        <Panel>
          <PanelHeader title={`${b.countryContext}: ${profile.name[locale]}`} description={active.name} />
          <dl className="grid gap-x-8 gap-y-5 p-5 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">{b.currency}</dt>
              <dd className="mt-1 text-foreground">
                {profile.currency}
                {profile.currencyNote && <span className="mt-1 block text-xs text-muted-foreground">{profile.currencyNote[locale]}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">{b.payments}</dt>
              <dd className="mt-1 text-foreground">
                {profile.mobileMoney.length > 0 && <span className="block">{profile.mobileMoney.join(" · ")}</span>}
                <span className="mt-1 block text-xs text-muted-foreground">{profile.otherPayments[locale]}</span>
              </dd>
            </div>
            {profile.businessStructures.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{b.legalForms}</dt>
                <dd className="mt-1 space-y-1.5">
                  {profile.legalFramework && <p className="text-xs text-muted-foreground">{profile.legalFramework[locale]}</p>}
                  {profile.businessStructures.map((structure) => (
                    <p key={structure.name} className="text-foreground">
                      <span className="font-medium">{structure.name}</span>
                      <span className="text-muted-foreground"> — {structure.description[locale]}</span>
                    </p>
                  ))}
                </dd>
              </div>
            )}
            {profile.authorities.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{b.authorities}</dt>
                <dd className="mt-1 space-y-1.5">
                  {profile.authorities.map((authority) => (
                    <p key={authority.name} className="text-foreground">
                      <span className="font-medium">{authority.name}</span>
                      <span className="text-muted-foreground"> — {authority.role[locale]}</span>
                    </p>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-muted-foreground">{b.channels}</dt>
              <dd className="mt-1 text-foreground">{profile.acquisitionChannels[locale]}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">{b.realities}</dt>
              <dd className="mt-1 text-foreground">{profile.operatingRealities[locale]}</dd>
            </div>
          </dl>
          <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground">
            {profile.detailed ? b.adviceNote : `${b.genericProfile} ${b.adviceNote}`}
          </p>
        </Panel>
      )}
    </PageShell>
  )
}
