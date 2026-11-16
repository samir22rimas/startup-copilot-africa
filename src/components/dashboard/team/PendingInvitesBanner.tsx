import { getMyPendingInvitations } from "@/src/app/actions/team"
import { InviteActions } from "@/src/components/dashboard/team/InviteActions"
import { ROLE_LABEL } from "@/src/lib/team"
import { Users } from "lucide-react"

/**
 * Shown at the top of the dashboard when someone has invited the signed-in
 * user (by their verified email) to join a startup. Renders nothing otherwise.
 */
export async function PendingInvitesBanner() {
  const invitations = await getMyPendingInvitations()
  if (invitations.length === 0) return null

  return (
    <div className="mx-auto mb-4 w-full max-w-7xl space-y-3 sm:mb-6">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50/80 p-4 dark:border-green-900/40 dark:bg-green-950/30 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
              <Users className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                {invitation.inviterName} invited you to join {invitation.startupName}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                as {ROLE_LABEL[invitation.role]}
                {invitation.message ? ` — “${invitation.message}”` : ""}
              </p>
            </div>
          </div>
          <InviteActions invitationId={invitation.id} compact />
        </div>
      ))}
    </div>
  )
}
