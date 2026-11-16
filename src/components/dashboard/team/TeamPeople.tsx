"use client"

import {
  inviteTeamMember,
  leaveTeam,
  removeTeamMember,
  revokeInvitation,
  updateMemberRole,
} from "@/src/app/actions/team"
import { TeamAvatar } from "@/src/components/dashboard/team/TeamAvatar"
import type { MemberRole } from "@/src/lib/database.types"
import {
  INVITABLE_ROLES,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  type InvitableRole,
  type TeamInvitation,
  type TeamMember,
} from "@/src/lib/team"
import { cn } from "@/src/lib/utils"
import { formatDistanceToNowStrict } from "date-fns"
import { Check, Copy, Loader2, LogOut, Mail, MessageCircle, Trash2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

const ROLE_BADGE: Record<MemberRole, string> = {
  owner: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  admin: "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  member: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  advisor: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  viewer: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
}

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-green-900/40"

function inviteText(startupName: string, url: string) {
  return `You're invited to join ${startupName} on Anza, our startup workspace. Accept here: ${url}`
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Invite link copied")
  } catch {
    toast.error("Could not copy — select the link and copy it manually.")
  }
}

function ShareButtons({ startupName, invitation }: { startupName: string; invitation: TeamInvitation }) {
  const text = inviteText(startupName, invitation.inviteUrl)
  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} onClick={() => copyToClipboard(invitation.inviteUrl)}>
        <Copy className="size-3.5" /> Copy link
      </button>
      <a
        className={buttonClass}
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle className="size-3.5" /> WhatsApp
      </a>
      <a
        className={buttonClass}
        href={`mailto:${encodeURIComponent(invitation.email)}?subject=${encodeURIComponent(
          `Join ${startupName} on Anza`,
        )}&body=${encodeURIComponent(text)}`}
      >
        <Mail className="size-3.5" /> Email
      </a>
    </div>
  )
}

export function TeamPeople({
  startupName,
  members,
  invitations,
  role,
  canManage,
  canInviteAdmins,
  seatLimit,
  seatsUsed,
  ownerTier,
}: {
  startupName: string
  members: TeamMember[]
  invitations: TeamInvitation[]
  role: MemberRole
  canManage: boolean
  canInviteAdmins: boolean
  seatLimit: number
  seatsUsed: number
  ownerTier: string
}) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<InvitableRole>("member")
  const [note, setNote] = React.useState("")
  const [inviting, setInviting] = React.useState(false)
  const [inviteError, setInviteError] = React.useState("")
  const [latestInvite, setLatestInvite] = React.useState<TeamInvitation | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const roleOptions = INVITABLE_ROLES.filter((r) => r !== "admin" || canInviteAdmins)
  const seatsLeft = Math.max(0, seatLimit - seatsUsed)

  /** Whether the signed-in user may change or remove this member (mirrors the database rules). */
  function canManageMember(member: TeamMember) {
    if (!canManage || member.isYou || member.role === "owner") return false
    return role === "owner" || member.role === "member" || member.role === "advisor"
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (inviting) return
    setInviting(true)
    setInviteError("")
    const res = await inviteTeamMember({ email, role: inviteRole, message: note })
    setInviting(false)
    if (!res.success) {
      setInviteError(res.error)
      return
    }
    setLatestInvite(res.invitation)
    setEmail("")
    setNote("")
    toast.success("Invitation created — share the link with them")
    router.refresh()
  }

  async function run(id: string, action: () => Promise<{ success: boolean; error?: string }>, done: string) {
    setBusyId(id)
    const res = await action()
    setBusyId(null)
    if (!res.success) {
      toast.error(res.error ?? "Something went wrong.")
      return false
    }
    toast.success(done)
    router.refresh()
    return true
  }

  async function handleLeave() {
    if (!window.confirm(`Leave ${startupName}? You will lose access to this workspace.`)) return
    const ok = await run("leave", leaveTeam, "You left the team")
    if (ok) router.push("/dashboard")
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Members */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">People</h2>
          <span className="text-[11px] font-semibold text-zinc-500" title={`${ownerTier} plan`}>
            {seatsUsed} of {seatLimit} seats used
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          {members.map((member) => {
            const manageable = canManageMember(member)
            return (
              <li key={member.userId} className="flex items-start gap-3">
                <TeamAvatar name={member.fullName} avatarUrl={member.avatarUrl} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {member.fullName}
                    {member.isYou && <span className="ml-1 font-medium text-zinc-400">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{member.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {manageable ? (
                      <select
                        aria-label={`Role for ${member.fullName}`}
                        value={member.role}
                        disabled={busyId === member.userId}
                        onChange={(e) =>
                          run(
                            member.userId,
                            () => updateMemberRole(member.userId, e.target.value as InvitableRole),
                            "Role updated",
                          )
                        }
                        className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-semibold text-zinc-700 outline-none focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                        {/* An admin managing someone keeps seeing that person's current role. */}
                        {!roleOptions.includes(member.role as InvitableRole) && (
                          <option value={member.role}>{ROLE_LABEL[member.role]}</option>
                        )}
                      </select>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          ROLE_BADGE[member.role],
                        )}
                        title={ROLE_DESCRIPTION[member.role]}
                      >
                        {ROLE_LABEL[member.role]}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400">
                      joined {formatDistanceToNowStrict(new Date(member.joinedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {manageable && (
                  <button
                    type="button"
                    aria-label={`Remove ${member.fullName} from the team`}
                    disabled={busyId === member.userId}
                    onClick={() => {
                      if (window.confirm(`Remove ${member.fullName} from ${startupName}?`)) {
                        void run(member.userId, () => removeTeamMember(member.userId), "Removed from the team")
                      }
                    }}
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                  >
                    {busyId === member.userId ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {role !== "owner" && (
          <button
            type="button"
            onClick={handleLeave}
            disabled={busyId === "leave"}
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            <LogOut className="size-3.5" /> Leave team
          </button>
        )}
      </section>

      {/* Invite */}
      {canManage && (
        <section className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-zinc-900 sm:rounded-3xl sm:p-6">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-green-700 dark:text-green-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Invite a co-founder or teammate</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            They get a private link. Only the person who signs in with the invited email can accept it.
          </p>

          <form onSubmit={handleInvite} className="mt-4 space-y-3">
            <div>
              <label htmlFor="invite-email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                required
                autoComplete="off"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cofounder@example.com"
                className={cn(inputClass, "mt-1.5")}
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InvitableRole)}
                className={cn(inputClass, "mt-1.5")}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{ROLE_DESCRIPTION[inviteRole]}</p>
            </div>
            <div>
              <label htmlFor="invite-note" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Personal note (optional)
              </label>
              <textarea
                id="invite-note"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Excited to build this with you."
                className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-green-900/40"
              />
            </div>

            {inviteError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {inviteError}
              </p>
            )}

            <button
              type="submit"
              disabled={inviting || seatsLeft === 0}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-700 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {seatsLeft === 0 ? "No seats left on this plan" : "Create invitation"}
            </button>
          </form>

          {latestInvite && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50/70 p-3 dark:border-green-900/40 dark:bg-green-950/30">
              <p className="flex items-center gap-1.5 text-xs font-bold text-green-800 dark:text-green-300">
                <Check className="size-3.5" /> Invitation ready for {latestInvite.email}
              </p>
              <p className="mt-1.5 break-all rounded-lg bg-white px-2.5 py-2 font-mono text-[11px] text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                {latestInvite.inviteUrl}
              </p>
              <div className="mt-2.5">
                <ShareButtons startupName={startupName} invitation={latestInvite} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Pending invitations */}
      {canManage && invitations.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl sm:p-6">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Pending invitations</h2>
          <ul className="mt-3 space-y-4">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{invitation.email}</p>
                    <p className="text-[11px] text-zinc-500">
                      {ROLE_LABEL[invitation.role]} ·{" "}
                      {invitation.isExpired ? (
                        <span className="font-semibold text-red-600">expired</span>
                      ) : (
                        <>expires {formatDistanceToNowStrict(new Date(invitation.expiresAt), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === invitation.id}
                    onClick={() => run(invitation.id, () => revokeInvitation(invitation.id), "Invitation revoked")}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
                  >
                    {busyId === invitation.id ? "Revoking…" : "Revoke"}
                  </button>
                </div>
                {!invitation.isExpired && <ShareButtons startupName={startupName} invitation={invitation} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Roles */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl sm:p-6">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white">What each role can do</h2>
        <dl className="mt-3 space-y-3">
          {(["owner", "admin", "member", "advisor"] as const).map((r) => (
            <div key={r}>
              <dt>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", ROLE_BADGE[r])}>
                  {ROLE_LABEL[r]}
                </span>
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-zinc-500">{ROLE_DESCRIPTION[r]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
