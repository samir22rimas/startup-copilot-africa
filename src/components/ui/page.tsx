import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Info, Lock } from "lucide-react"
import * as React from "react"

import { cn } from "@/src/lib/utils"

/** Standard width and rhythm for a workspace page. */
export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl space-y-6 pb-12", className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string
  description?: string
  eyebrow?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Panel({
  children,
  className,
  as: Tag = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "aside" }) {
  return (
    <Tag className={cn("rounded-xl border border-border bg-card text-card-foreground", className)} {...props}>
      {children}
    </Tag>
  )
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-border px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const NOTICE_TONE = {
  info: { icon: Info, className: "border-border bg-muted/60 text-foreground" },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100",
  },
  locked: { icon: Lock, className: "border-border bg-muted/60 text-foreground" },
} as const

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof NOTICE_TONE
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const { icon: Icon, className: toneClass } = NOTICE_TONE[tone]
  return (
    <div role="note" className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", toneClass, className)}>
      <Icon className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden="true" />
      <div className="min-w-0 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
    </div>
  )
}

const BADGE_TONE = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-accent text-accent-foreground",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
} as const

export type BadgeTone = keyof typeof BADGE_TONE

export function Badge({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4",
        BADGE_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Shared control styles so every form in the app looks the same. */
export const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-60"

export const textareaClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-60"

export const primaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"

export const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"

export const ghostButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}
