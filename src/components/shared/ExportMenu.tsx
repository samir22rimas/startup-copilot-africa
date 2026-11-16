"use client"

import { cn } from "@/src/lib/utils"
import { ChevronDown, Download, Loader2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

export interface ExportOption {
  id: string
  label: string
  /** Short hint, e.g. "Editable slides". */
  hint?: string
  run: () => Promise<void>
}

/** A "Download" button that opens a small menu of file formats. */
export function ExportMenu({
  label = "Download",
  options,
  className,
  align = "right",
}: {
  label?: string
  options: ExportOption[]
  className?: string
  align?: "left" | "right"
}) {
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  async function handle(option: ExportOption) {
    setOpen(false)
    setBusy(option.id)
    try {
      await option.run()
      toast.success(`${option.label} downloaded`)
    } catch (error) {
      console.error("Export failed", error)
      toast.error("The file could not be created. Check your connection and try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy !== null}
        onClick={() => setOpen((value) => !value)}
        className={cn("inline-flex items-center justify-center gap-2 disabled:opacity-60", className)}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {busy ? "Preparing…" : label}
        <ChevronDown className="size-3.5 opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-left shadow-xl dark:border-zinc-700 dark:bg-zinc-900",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              onClick={() => handle(option)}
              className="block w-full px-4 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{option.label}</span>
              {option.hint && <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{option.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
