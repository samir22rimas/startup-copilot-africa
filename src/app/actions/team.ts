"use server"

import { revalidatePath } from "next/cache"

import { writeActiveStartupCookie } from "@/src/lib/active-startup"
import type { MemberRole } from "@/src/lib/database.types"
import { getEntitlementsForUserId } from "@/src/lib/entitlements"
import { checkRateLimit } from "@/src/lib/rate-limiter"
import { getSiteUrl } from "@/src/lib/site-url"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import {
  INVITABLE_ROLES,
  type InvitableRole,
  type InvitationPreview,
  type PendingInvitation,
  type TeamInvitation,
  type TeamMember,
  type TeamOverview,
} from "@/src/lib/team"
import { cleanText, isUuid, normalizeEmail } from "@/src/lib/validation"
import { canManageStartup, getActiveStartupAccess } from "@/src/lib/workspace-access"

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const SETUP_REQUIRED =
  "Team features are not set up yet. Apply the latest database migration (supabase db push) and reload."

/** PostgREST / Postgres codes meaning "this table or function does not exist yet". */
function isMissingSchema(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return (
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    error.code === "42883" ||
    error.code === "42P01" ||
    /could not find the (function|table)|schema cache/i.test(error.message ?? "")
  )
}

function isInvitableRole(value: unknown): value is InvitableRole {
  return typeof value === "string" && (INVITABLE_ROLES as readonly string[]).includes(value)
}

/** The startup owner controls team seats; platform-admin owners have no cap. */
async function getOwnerEntitlements(ownerId: string) {
  return getEntitlementsForUserId(ownerId)
}

async function inviteUrlFor(invitationId: string) {
  return `${await getSiteUrl()}/invite/${invitationId}`
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getTeamOverview(): Promise<TeamOverview> {
  const access = await getActiveStartupAccess()
  if ("error" in access) return { ready: false, reason: "no_startup", message: access.error }

  const { supabase, user, startup, role } = access

  const { data: roster, error: rosterError } = await supabase.rpc("get_startup_team", {
    target_startup_id: startup.id,
  })
  if (rosterError) {
    if (isMissingSchema(rosterError)) return { ready: false, reason: "setup_required", message: SETUP_REQUIRED }
    console.error("getTeamOverview roster", rosterError.message)
    return { ready: false, reason: "error", message: "Could not load your team. Please try again." }
  }

  const members: TeamMember[] = (roster ?? []).map((m) => ({
    userId: m.user_id,
    fullName: m.full_name?.trim() || m.email.split("@")[0] || "Team member",
    avatarUrl: m.avatar_url,
    email: m.email,
    role: m.role,
    joinedAt: m.joined_at,
    isYou: m.user_id === user.id,
  }))

  const canManage = canManageStartup(role)
  let invitations: TeamInvitation[] = []
  if (canManage) {
    const { data: pending } = await supabase
      .from("startup_invitations")
      .select("id, email, role, message, expires_at, created_at")
      .eq("startup_id", startup.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    const origin = await getSiteUrl()
    invitations = (pending ?? []).map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role as InvitableRole,
      message: i.message,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
      isExpired: new Date(i.expires_at).getTime() <= Date.now(),
      inviteUrl: `${origin}/invite/${i.id}`,
    }))
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("startup_id", startup.id)
    .neq("status", "archived")
    .order("created_at", { ascending: true })

  const owner = await getOwnerEntitlements(startup.owner_id)
  const seatLimit = owner.unlimited ? null : owner.limits.teamSeats

  return {
    ready: true,
    startup: { id: startup.id, name: startup.name },
    currentUserId: user.id,
    role,
    canManage,
    canInviteAdmins: role === "owner",
    members,
    invitations,
    channels: [
      { id: null, name: "General" },
      ...(projects ?? []).map((p) => ({ id: p.id as string | null, name: p.title })),
    ],
    ownerTier: owner.tier,
    seatLimit,
    seatsUsed: members.length + invitations.filter((i) => !i.isExpired).length,
  }
}

// ---------------------------------------------------------------------------
// Invitations (managing side)
// ---------------------------------------------------------------------------

export async function inviteTeamMember(input: {
  email: string
  role: InvitableRole
  message?: string
}): Promise<Result<{ invitation: TeamInvitation }>> {
  const email = normalizeEmail(input?.email)
  if (!email) return { success: false, error: "Enter a valid email address." }
  if (!isInvitableRole(input?.role)) return { success: false, error: "Choose a role for this person." }
  const message = cleanText(input.message, 500) || null

  const access = await getActiveStartupAccess()
  if ("error" in access) return { success: false, error: access.error }
  const { supabase, user, startup, role } = access

  if (!canManageStartup(role)) {
    return { success: false, error: "Only the owner and co-founder admins can invite people." }
  }
  if (input.role === "admin" && role !== "owner") {
    return { success: false, error: "Only the owner can invite another co-founder admin." }
  }
  if (email === user.email?.toLowerCase()) {
    return { success: false, error: "You are already on this team." }
  }

  const limit = await checkRateLimit(user.id, "team_invite", { maxRequests: 20, windowSeconds: 3600 })
  if (!limit.allowed) return { success: false, error: limit.message }

  const { data: roster, error: rosterError } = await supabase.rpc("get_startup_team", {
    target_startup_id: startup.id,
  })
  if (rosterError) {
    return { success: false, error: isMissingSchema(rosterError) ? SETUP_REQUIRED : "Could not load your team." }
  }
  if ((roster ?? []).some((m) => m.email.toLowerCase() === email)) {
    return { success: false, error: "That person is already on this team." }
  }

  // Expired invitations no longer hold a seat (and would block a fresh invite to the same email).
  await supabase
    .from("startup_invitations")
    .delete()
    .eq("startup_id", startup.id)
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString())

  const { count: pendingCount } = await supabase
    .from("startup_invitations")
    .select("id", { count: "exact", head: true })
    .eq("startup_id", startup.id)
    .eq("status", "pending")

  const owner = await getOwnerEntitlements(startup.owner_id)
  const seatLimit = owner.unlimited ? null : owner.limits.teamSeats
  if (seatLimit !== null && (roster ?? []).length + (pendingCount ?? 0) >= seatLimit) {
    return {
      success: false,
      error: `This team has used all ${seatLimit} seats included in the ${owner.tier} plan. Remove someone, revoke a pending invite, or upgrade.`,
    }
  }

  const { data: created, error } = await supabase
    .from("startup_invitations")
    .insert({ startup_id: startup.id, email, role: input.role, invited_by: user.id, message })
    .select("id, email, role, message, expires_at, created_at")
    .single()

  if (error || !created) {
    if (error?.code === "23505") {
      return { success: false, error: "There is already a pending invitation for that email." }
    }
    if (error) console.error("inviteTeamMember", error.message)
    return { success: false, error: "Could not create the invitation. Please try again." }
  }

  revalidatePath("/dashboard/team")
  return {
    success: true,
    invitation: {
      id: created.id,
      email: created.email,
      role: created.role as InvitableRole,
      message: created.message,
      expiresAt: created.expires_at,
      createdAt: created.created_at,
      isExpired: false,
      inviteUrl: await inviteUrlFor(created.id),
    },
  }
}

export async function revokeInvitation(invitationId: string): Promise<Result> {
  if (!isUuid(invitationId)) return { success: false, error: "Invitation not found." }

  const access = await getActiveStartupAccess()
  if ("error" in access) return { success: false, error: access.error }

  const { data: deleted, error } = await access.supabase
    .from("startup_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("startup_id", access.startup.id)
    .eq("status", "pending")
    .select("id")

  if (error || !deleted?.length) {
    if (error) console.error("revokeInvitation", error.message)
    return { success: false, error: "That invitation could not be revoked." }
  }

  revalidatePath("/dashboard/team")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function updateMemberRole(memberUserId: string, newRole: InvitableRole): Promise<Result> {
  if (!isUuid(memberUserId) || !isInvitableRole(newRole)) {
    return { success: false, error: "Choose a valid role." }
  }

  const access = await getActiveStartupAccess()
  if ("error" in access) return { success: false, error: access.error }
  if (!canManageStartup(access.role)) {
    return { success: false, error: "Only the owner and co-founder admins can change roles." }
  }
  if (memberUserId === access.user.id) {
    return { success: false, error: "You cannot change your own role." }
  }

  // Row-level security re-checks all of this (owner row immutable, admins
  // limited to members/advisors); zero updated rows means it was refused.
  const { data: updated, error } = await access.supabase
    .from("startup_members")
    .update({ role: newRole as MemberRole })
    .eq("startup_id", access.startup.id)
    .eq("user_id", memberUserId)
    .select("user_id")

  if (error || !updated?.length) {
    if (error && !isMissingSchema(error)) console.error("updateMemberRole", error.message)
    return { success: false, error: "You do not have permission to change that person's role." }
  }

  revalidatePath("/dashboard/team")
  return { success: true }
}

export async function removeTeamMember(memberUserId: string): Promise<Result> {
  if (!isUuid(memberUserId)) return { success: false, error: "Team member not found." }

  const access = await getActiveStartupAccess()
  if ("error" in access) return { success: false, error: access.error }
  if (!canManageStartup(access.role)) {
    return { success: false, error: "Only the owner and co-founder admins can remove people." }
  }
  if (memberUserId === access.user.id) {
    return { success: false, error: "Use “Leave team” to remove yourself." }
  }

  const { data: deleted, error } = await access.supabase
    .from("startup_members")
    .delete()
    .eq("startup_id", access.startup.id)
    .eq("user_id", memberUserId)
    .select("user_id")

  if (error || !deleted?.length) {
    if (error) console.error("removeTeamMember", error.message)
    return { success: false, error: "You do not have permission to remove that person." }
  }

  revalidatePath("/dashboard/team")
  return { success: true }
}

export async function leaveTeam(): Promise<Result> {
  const access = await getActiveStartupAccess()
  if ("error" in access) return { success: false, error: access.error }
  if (access.role === "owner") {
    return { success: false, error: "The owner cannot leave their own startup." }
  }

  const { data: deleted, error } = await access.supabase
    .from("startup_members")
    .delete()
    .eq("startup_id", access.startup.id)
    .eq("user_id", access.user.id)
    .select("user_id")

  if (error || !deleted?.length) {
    if (error) console.error("leaveTeam", error.message)
    return { success: false, error: "Could not leave the team. Please try again." }
  }

  revalidatePath("/dashboard", "layout")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Invitations (invitee side)
// ---------------------------------------------------------------------------

export async function getInvitationPreview(invitationId: string): Promise<InvitationPreview | null> {
  if (!isUuid(invitationId)) return null

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_invitation_preview", {
    target_invitation_id: invitationId,
  })
  const row = data?.[0]
  if (error || !row) return null

  return {
    id: invitationId,
    startupName: row.startup_name,
    inviterName: row.inviter_name,
    role: row.role as InvitableRole,
    emailHint: row.email_hint,
    status: row.status,
    isExpired: row.is_expired,
    isForCurrentUser: row.is_for_current_user,
  }
}

export async function getMyPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase.rpc("get_my_pending_invitations")
  if (error || !data) return []

  return data.map((i) => ({
    id: i.id,
    startupId: i.startup_id,
    startupName: i.startup_name,
    inviterName: i.inviter_name,
    role: i.role as InvitableRole,
    message: i.message,
    expiresAt: i.expires_at,
  }))
}

const ACCEPT_ERRORS: Record<string, string> = {
  not_authenticated: "Please sign in to accept this invitation.",
  email_not_verified: "Confirm your email address first, then open the invitation again.",
  invitation_not_found: "This invitation no longer exists. Ask for a new one.",
  invitation_email_mismatch:
    "This invitation was sent to a different email address. Sign in with the invited email to accept it.",
  invitation_not_pending: "This invitation has already been used or withdrawn.",
  invitation_expired: "This invitation has expired. Ask for a new one.",
  team_is_full: "This team is full. Ask the owner to free up a seat.",
}

export async function acceptInvitation(invitationId: string): Promise<Result<{ startupId: string }>> {
  if (!isUuid(invitationId)) return { success: false, error: ACCEPT_ERRORS.invitation_not_found }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ACCEPT_ERRORS.not_authenticated }

  // The database function is the gatekeeper: it only adds the caller to the
  // team if their verified email is the invited one.
  const { data: startupId, error } = await supabase.rpc("accept_startup_invitation", {
    target_invitation_id: invitationId,
  })

  if (error || !startupId) {
    if (isMissingSchema(error)) return { success: false, error: SETUP_REQUIRED }
    const known = Object.keys(ACCEPT_ERRORS).find((key) => error?.message?.includes(key))
    if (!known && error) console.error("acceptInvitation", error.message)
    return { success: false, error: known ? ACCEPT_ERRORS[known] : "Could not accept the invitation. Please try again." }
  }

  try {
    await writeActiveStartupCookie(startupId)
  } catch {
    // Non-blocking: the startup is still reachable from the business switcher.
  }

  revalidatePath("/dashboard", "layout")
  return { success: true, startupId }
}

export async function declineInvitation(invitationId: string): Promise<Result> {
  if (!isUuid(invitationId)) return { success: false, error: ACCEPT_ERRORS.invitation_not_found }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: ACCEPT_ERRORS.not_authenticated }

  const { error } = await supabase.rpc("decline_startup_invitation", {
    target_invitation_id: invitationId,
  })
  if (error) return { success: false, error: "Could not decline the invitation." }

  revalidatePath("/dashboard")
  return { success: true }
}
