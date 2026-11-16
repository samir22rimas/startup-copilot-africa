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
      seatLimit: number
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
