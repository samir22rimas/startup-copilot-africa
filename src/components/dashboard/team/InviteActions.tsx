"use client"

import { acceptInvitation, declineInvitation } from "@/src/app/actions/team"
import { cn } from "@/src/lib/utils"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

/** Accept / decline buttons for one invitation. */
export function InviteActions({
  invitationId,
  compact = false,
}: {
  invitationId: string
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState<"accept" | "decline" | null>(null)
  const [error, setError] = React.useState("")

  async function handleAccept() {
    setPending("accept")
    setError("")
    const res = await acceptInvitation(invitationId)
    if (!res.success) {
      setError(res.error)
      setPending(null)
      return
    }
    // Full navigation so the sidebar picks up the newly joined startup.
    window.location.assign("/dashboard/team")
  }

  async function handleDecline() {
    setPending("decline")
    setError("")
    const res = await declineInvitation(invitationId)
    if (!res.success) {
      setError(res.error)
      setPending(null)
      return
    }
    if (compact) {
      router.refresh()
      setPending(null)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className={cn(compact ? "shrink-0" : "w-full")}>
      <div className={cn("flex gap-2", compact ? "" : "flex-col sm:flex-row")}>
        <button
          type="button"
          onClick={handleAccept}
          disabled={pending !== null}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 font-semibold text-white transition hover:bg-green-800 disabled:opacity-60",
            compact ? "h-9 px-4 text-xs" : "h-12 flex-1 px-6 text-sm",
          )}
        >
          {pending === "accept" && <Loader2 className="size-4 animate-spin" />}
          {compact ? "Accept" : "Accept invitation"}
        </button>
        <button
          type="button"
          onClick={handleDecline}
          disabled={pending !== null}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
            compact ? "h-9 px-4 text-xs" : "h-12 px-6 text-sm",
          )}
        >
          {pending === "decline" && <Loader2 className="size-4 animate-spin" />}
          Decline
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
