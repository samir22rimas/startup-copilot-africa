"use client"

import { X } from "lucide-react"
import * as React from "react"

import { cn } from "@/src/lib/utils"

/** Accessible modal dialog: focus moves in, Escape and backdrop close it. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close",
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg"
  closeLabel?: string
}) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()

  React.useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none sm:rounded-xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export interface TabItem<T extends string> {
  id: T
  label: string
  count?: number
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  label,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
  label?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
