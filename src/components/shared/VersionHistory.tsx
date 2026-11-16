"use client"

import { History, Loader2, RotateCcw } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Modal } from "@/src/components/ui/overlay"
import { EmptyState, secondaryButtonClass } from "@/src/components/ui/page"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"

export interface VersionItem {
  id: string
  version: number
  note: string | null
  created_at: string
}

/** "Version history" button + dialog, shared by every versioned document. */
export function VersionHistory({
  load,
  onRestore,
  canRestore,
  className = secondaryButtonClass,
}: {
  load: () => Promise<VersionItem[]>
  /** Resolves true when the version was restored. */
  onRestore: (versionId: string) => Promise<boolean>
  canRestore: boolean
  className?: string
}) {
  const { t, locale } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [versions, setVersions] = React.useState<VersionItem[] | null>(null)
  const [restoring, setRestoring] = React.useState<string | null>(null)

  async function handleOpen() {
    setOpen(true)
    setVersions(null)
    try {
      setVersions(await load())
    } catch {
      setVersions([])
      toast.error(t.common.errorGeneric)
    }
  }

  async function handleRestore(id: string) {
    setRestoring(id)
    try {
      if (await onRestore(id)) {
        toast.success(t.common.restored)
        setOpen(false)
      }
    } finally {
      setRestoring(null)
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={className}>
        <History className="size-4" /> {t.common.versions}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.common.versions} closeLabel={t.common.close} size="md">
        {versions === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <EmptyState icon={History} title={t.common.versions} description={t.common.noVersions} className="py-8" />
        ) : (
          <ul className="divide-y divide-border">
            {versions.map((version) => (
              <li key={version.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{fmt(t.common.versionN, { n: version.version })}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(version.created_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                    {version.note ? ` · ${version.note}` : ""}
                  </p>
                </div>
                {canRestore && (
                  <button
                    type="button"
                    disabled={restoring !== null}
                    onClick={() => handleRestore(version.id)}
                    className={secondaryButtonClass}
                  >
                    {restoring === version.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                    {t.common.restore}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}
