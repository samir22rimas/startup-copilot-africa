"use client"

import { Languages } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { setLocale } from "@/src/app/actions/locale"
import { useI18n } from "@/src/lib/i18n/client"
import { LOCALES, LOCALE_LABEL, type Locale } from "@/src/lib/i18n/config"
import { cn } from "@/src/lib/utils"

/** Compact EN / FR toggle. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function choose(next: Locale) {
    if (next === locale || pending) return
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={cn("inline-flex h-8 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5", className)}
    >
      <Languages className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden="true" />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={LOCALE_LABEL[code]}
          aria-pressed={code === locale}
          disabled={pending}
          onClick={() => choose(code)}
          className={cn(
            "h-6 rounded-md px-1.5 text-[11px] font-semibold uppercase transition",
            code === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
