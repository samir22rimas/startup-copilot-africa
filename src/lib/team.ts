import type { InvitationStatus, MemberRole } from "@/src/lib/database.types"
import type { UserPlanTier } from "@/src/lib/plans"

/** Roles a person can be invited as (ownership is never handed out by invitation). */
export const INVITABLE_ROLES = ["admin", "member", "advisor", "viewer"] as const
export type InvitableRole = (typeof INVITABLE_ROLES)[number]

export const TEAM_MESSAGE_MAX_LENGTH = 4000
export const TEAM_MESSAGE_PAGE_SIZE = 50

/** Typing this at the start of a team message asks the AI Copilot to answer in the channel. */
export const COPILOT_MENTION = "@copilot"

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  member: "Editor",
  advisor: "Advisor",
  viewer: "Viewer",
}

export const ROLE_DESCRIPTION: Record<MemberRole, string> = {
  owner: "Created the startup. Full control, including the team and ownership.",
  admin: "Full workspace access. Can change business settings and manage editors, advisors and viewers.",
  member: "Creates and edits everything in the workspace: plans, tasks, documents and research.",
  advisor: "A mentor or investor. Can read everything, comment on tasks and take part in team chat.",
  viewer: "Read-only access to the workspace.",
}

export interface TeamMember {
  userId: string
  fullName: string
  avatarUrl: string | null
  email: string
  role: MemberRole
  joinedAt: string
  isYou: boolean
}

export interface TeamInvitation {
  id: string
  email: string
  role: InvitableRole
  message: string | null
  expiresAt: string
  createdAt: string
  isExpired: boolean
  inviteUrl: string
}

export interface TeamChannel {
  /** Project id, or null for the startup-wide General channel. */
  id: string | null
  name: string
}

/** Reactions offered in team chat, in display order. Keys are what the database stores. */
export const TEAM_REACTIONS = [
  { key: "thumbs_up", emoji: "👍" },
  { key: "heart", emoji: "❤️" },
  { key: "party", emoji: "🎉" },
  { key: "laugh", emoji: "😂" },
  { key: "thanks", emoji: "🙏" },
  { key: "eyes", emoji: "👀" },
  { key: "check", emoji: "✅" },
  { key: "fire", emoji: "🔥" },
] as const

export type TeamReactionKey = (typeof TEAM_REACTIONS)[number]["key"]

export function isTeamReactionKey(value: unknown): value is TeamReactionKey {
  return typeof value === "string" && TEAM_REACTIONS.some((reaction) => reaction.key === value)
}

export interface TeamReaction {
  key: TeamReactionKey
  userIds: string[]
}

/** "general" for the business-wide channel, otherwise the project id. */
export function channelKeyOf(projectId: string | null): string {
  return projectId ?? "general"
}

/** First name used for @mentions, e.g. "Awa Ndiaye" -> "Awa". */
export function mentionHandle(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim()
}

/**
 * Teammates mentioned as @Name in a message (case-insensitive, on word
 * boundaries). Used to highlight mentions and to tell people they were named.
 */
export function findMentionedMembers<T extends { userId: string; fullName: string }>(content: string, members: T[]): T[] {
  const lower = content.toLowerCase()
  return members.filter((member) => {
    const handles = new Set([member.fullName.trim(), mentionHandle(member.fullName)].filter(Boolean))
    for (const handle of handles) {
      const needle = `@${handle.toLowerCase()}`
      let index = lower.indexOf(needle)
      while (index !== -1) {
        const before = index === 0 ? " " : lower[index - 1]
        const after = lower[index + needle.length] ?? " "
        if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after)) return true
        index = lower.indexOf(needle, index + 1)
      }
    }
    return false
  })
}

export interface TeamMessage {
  id: string
  startupId: string
  projectId: string | null
  /** Null for Copilot messages and for people whose account was deleted. */
  authorId: string | null
  content: string
  isCopilot: boolean
  editedAt: string | null
  createdAt: string
  /** The message this one answers, if any. */
  replyToId: string | null
  reactions: TeamReaction[]
}

export type TeamOverview =
  | {
      ready: true
      startup: { id: string; name: string }
      currentUserId: string
      role: MemberRole
      canManage: boolean
      canInviteAdmins: boolean
      members: TeamMember[]
      invitations: TeamInvitation[]
      channels: TeamChannel[]
      ownerTier: UserPlanTier
      /** null means the startup owner is a platform administrator. */
      seatLimit: number | null
      seatsUsed: number
    }
  | { ready: false; reason: "no_startup" | "setup_required" | "error"; message: string }

export interface InvitationPreview {
  id: string
  startupName: string
  inviterName: string
  role: InvitableRole
  emailHint: string
  status: InvitationStatus
  isExpired: boolean
  isForCurrentUser: boolean
}

export interface PendingInvitation {
  id: string
  startupId: string
  startupName: string
  inviterName: string
  role: InvitableRole
  message: string | null
  expiresAt: string
}
