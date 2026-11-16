"use client"

import * as React from "react"
import { toast } from "sonner"

import { setFeatureSwitch, type FeatureSwitch } from "@/src/app/actions/admin-platform"
import { Badge, Panel } from "@/src/components/ui/page"
import { minimumPlanFor, type Feature } from "@/src/lib/plans"
import { cn } from "@/src/lib/utils"

/** Turn a feature off for everyone (for example during an incident) without a deploy. */
export function FeatureSwitches({ initial }: { initial: FeatureSwitch[] }) {
  const [switches, setSwitches] = React.useState(initial)
  const [pending, setPending] = React.useState<string | null>(null)

  async function toggle(item: FeatureSwitch) {
    setPending(item.key)
    const result = await setFeatureSwitch(item.key, !item.enabled)
    setPending(null)
    if (!result.success) return void toast.error(result.error)
    setSwitches((list) => list.map((row) => (row.key === item.key ? { ...row, enabled: !item.enabled, updatedAt: new Date().toISOString() } : row)))
  }

  return (
    <Panel>
      <ul className="divide-y divide-border">
        {switches.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0">
              <p className="font-mono text-sm text-foreground">{item.key}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge>{minimumPlanFor(item.key as Feature)} plan and above</Badge>
                {item.updatedAt && <span>Changed {new Date(item.updatedAt).toLocaleString("en")}</span>}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={item.enabled}
              aria-label={`${item.key} ${item.enabled ? "on" : "off"}`}
              disabled={pending !== null}
              onClick={() => toggle(item)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
                item.enabled ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", item.enabled ? "left-[1.375rem]" : "left-0.5")} />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
