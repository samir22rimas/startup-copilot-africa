"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { setActiveStartup } from "@/src/app/actions/startup-context"
import { secondaryButtonClass } from "@/src/components/ui/page"

export function BusinessSwitchButton({ startupId, label }: { startupId: string; label: string }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      className={secondaryButtonClass}
      onClick={() =>
        startTransition(async () => {
          const result = await setActiveStartup(startupId)
          if (!result.success) {
            toast.error(result.error)
            return
          }
          router.push("/dashboard")
          router.refresh()
        })
      }
    >
      {pending && <Loader2 className="size-4 animate-spin" />} {label}
    </button>
  )
}
