import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Markdown } from "@/src/components/shared/Markdown"
import { getI18n } from "@/src/lib/i18n/server"
import { PLAN_SECTIONS, readPlanSections } from "@/src/lib/plan"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export const dynamic = "force-dynamic"

// Shared plans are private documents behind an unguessable link.
export const metadata: Metadata = {
  title: "Shared business plan — Anza",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

/** Read-only view of a business plan, opened with a share link. No sign-in needed. */
export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) notFound()

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.rpc("get_shared_artifact", { share_token: token })
  const shared = data?.[0]
  if (!shared || shared.module !== "plan") notFound()

  const { t, locale } = await getI18n()
  const sections = readPlanSections(shared.content)
  const written = PLAN_SECTIONS.filter((key) => sections[key])

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Image src="/logo.png" alt="" width={28} height={28} className="size-7 rounded-md object-contain" />
            Anza
          </Link>
          <span className="text-xs text-muted-foreground">{t.plan.sharedReadOnly}</span>
        </header>

        <article className="rounded-xl border border-border bg-card p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{t.pages.plan.title}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{shared.startup_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(shared.updated_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <nav aria-label={t.plan.contents} className="mt-8 rounded-lg bg-muted/50 p-4">
            <p className="text-xs font-semibold text-foreground">{t.plan.contents}</p>
            <ol className="mt-2 grid list-decimal gap-1 pl-5 text-sm sm:grid-cols-2">
              {written.map((key) => (
                <li key={key}>
                  <a href={`#${key}`} className="text-primary underline-offset-4 hover:underline">
                    {t.plan.sections[key]}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {written.map((key) => (
            <section key={key} id={key} className="mt-10 scroll-mt-6">
              <h2 className="mb-3 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground">
                {t.plan.sections[key]}
              </h2>
              <Markdown content={sections[key]!.markdown} />
            </section>
          ))}
        </article>

        <p className="mt-6 text-center text-xs text-muted-foreground">{t.plan.sharedFooter}</p>
      </div>
    </main>
  )
}
