"use server"

import { revalidatePath } from "next/cache"

import { getProjects } from "@/src/features/business/services/project.service"
import { readActiveProjectCookie, resolveActiveProject } from "@/src/lib/active-project"
import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAi } from "@/src/lib/ai/service"
import type { Database, MemberRole } from "@/src/lib/database.types"
import { roleCan } from "@/src/lib/permissions"
import { checkRateLimit } from "@/src/lib/rate-limiter"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import {
  TEAM_MESSAGE_MAX_LENGTH,
  TEAM_MESSAGE_PAGE_SIZE,
  channelKeyOf,
  isTeamReactionKey,
  type TeamMessage,
  type TeamReaction,
  type TeamReactionKey,
} from "@/src/lib/team"
import { cleanText, isUuid } from "@/src/lib/validation"
import { requireWorkspace } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const SETUP_REQUIRED =
  "Team features are not set up yet. Apply the latest database migration (supabase db push) and reload."
const READ_ONLY = "Your role in this business is read-only: you can read the team chat but not post."

const COLUMNS_BASE = "id, startup_id, project_id, author_id, content, is_copilot, edited_at, created_at"
const COLUMNS_WITH_REPLIES = `${COLUMNS_BASE}, reply_to_id`

type MessageRow = {
  id: string
  startup_id: string
  project_id: string | null
  author_id: string | null
  content: string
  is_copilot: boolean
  edited_at: string | null
  created_at: string
  reply_to_id?: string | null
}

type MessageInsert = Database["public"]["Tables"]["team_messages"]["Insert"]

type DbError = { code?: string; message?: string } | null | undefined

/** PostgREST / Postgres codes meaning "this table or function does not exist yet". */
function isMissingSchema(error: DbError) {
  if (!error) return false
  return (
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    error.code === "42883" ||
    error.code === "42P01" ||
    /could not find the (function|table)|schema cache/i.test(error.message ?? "")
  )
}

/** The reply column is added by the team-chat-upgrade migration. */
function isMissingColumn(error: DbError) {
  return error?.code === "42703" || error?.code === "PGRST204" || /column .* does not exist/i.test(error?.message ?? "")
}

/** Remembered per server process once known, so the fallback costs one extra query at most. */
let repliesSupported: boolean | null = null

async function withMessageColumns<R extends { error: DbError }>(run: (columns: string) => PromiseLike<R>): Promise<R> {
  if (repliesSupported !== false) {
    const result = await run(COLUMNS_WITH_REPLIES)
    if (!isMissingColumn(result.error)) {
      repliesSupported = true
      return result
    }
    repliesSupported = false
  }
  return run(COLUMNS_BASE)
}

function mapMessage(row: MessageRow, reactions: TeamReaction[] = []): TeamMessage {
  return {
    id: row.id,
    startupId: row.startup_id,
    projectId: row.project_id,
    authorId: row.author_id,
    content: row.content,
    isCopilot: row.is_copilot,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    replyToId: row.reply_to_id ?? null,
    reactions,
  }
}

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>

type ChatScope = { ok: true; supabase: Supabase; userId: string; role: MemberRole } | { ok: false; error: string }

/** Signed-in member of this business, with their role. Row-level security enforces the same again. */
async function chatScope(startupId: string, projectId: string | null = null): Promise<ChatScope> {
  if (!isUuid(startupId) || (projectId !== null && !isUuid(projectId))) {
    return { ok: false, error: "This channel is not available." }
  }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Please sign in to continue." }

  const { data: membership } = await supabase
    .from("startup_members")
    .select("role")
    .eq("startup_id", startupId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!membership) return { ok: false, error: "This channel is not available." }
  return { ok: true, supabase, userId: user.id, role: membership.role }
}

async function reactionsFor(supabase: Supabase, messageIds: string[]): Promise<Map<string, TeamReaction[]>> {
  const byMessage = new Map<string, TeamReaction[]>()
  if (!messageIds.length) return byMessage
  const { data, error } = await supabase
    .from("team_message_reactions")
    .select("message_id, user_id, reaction, created_at")
    .in("message_id", messageIds)
    .order("created_at", { ascending: true })
  if (error) return byMessage // Reactions are optional until the migration is applied.

  for (const row of data ?? []) {
    if (!isTeamReactionKey(row.reaction)) continue
    const list = byMessage.get(row.message_id) ?? []
    const existing = list.find((reaction) => reaction.key === row.reaction)
    if (existing) existing.userIds.push(row.user_id)
    else list.push({ key: row.reaction, userIds: [row.user_id] })
    byMessage.set(row.message_id, list)
  }
  return byMessage
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function listTeamMessages(
  startupId: string,
  projectId: string | null,
  options: { before?: string } = {},
): Promise<Result<{ messages: TeamMessage[]; hasMore: boolean }>> {
  const scope = await chatScope(startupId, projectId)
  if (!scope.ok) return { success: false, error: scope.error }

  const { data, error } = await withMessageColumns((columns) => {
    let query = scope.supabase
      .from("team_messages")
      .select(columns)
      .eq("startup_id", startupId)
      .order("created_at", { ascending: false })
      .limit(TEAM_MESSAGE_PAGE_SIZE + 1)
    query = projectId === null ? query.is("project_id", null) : query.eq("project_id", projectId)
    if (options.before && !Number.isNaN(Date.parse(options.before))) {
      query = query.lt("created_at", new Date(options.before).toISOString())
    }
    return query
  })
  if (error) {
    if (isMissingSchema(error)) return { success: false, error: SETUP_REQUIRED }
    console.error("listTeamMessages", error.message)
    return { success: false, error: "Could not load messages." }
  }

  const rows = ((data ?? []) as unknown as MessageRow[]).slice(0, TEAM_MESSAGE_PAGE_SIZE).reverse()
  const reactions = await reactionsFor(scope.supabase, rows.map((row) => row.id))
  return {
    success: true,
    hasMore: (data ?? []).length > TEAM_MESSAGE_PAGE_SIZE,
    messages: rows.map((row) => mapMessage(row, reactions.get(row.id))),
  }
}

/** A single message (for replies whose original is not in the loaded page). */
export async function getTeamMessage(startupId: string, messageId: string): Promise<TeamMessage | null> {
  if (!isUuid(messageId)) return null
  const scope = await chatScope(startupId)
  if (!scope.ok) return null
  const { data } = await withMessageColumns((columns) =>
    scope.supabase.from("team_messages").select(columns).eq("id", messageId).eq("startup_id", startupId).maybeSingle(),
  )
  return data ? mapMessage(data as unknown as MessageRow) : null
}

export async function sendTeamMessage(
  startupId: string,
  projectId: string | null,
  content: string,
  replyToId?: string | null,
): Promise<Result<{ message: TeamMessage }>> {
  const text = cleanText(content, TEAM_MESSAGE_MAX_LENGTH + 1)
  if (!text) return { success: false, error: "Type a message first." }
  if (text.length > TEAM_MESSAGE_MAX_LENGTH) {
    return { success: false, error: `Messages can be up to ${TEAM_MESSAGE_MAX_LENGTH} characters.` }
  }
  if (replyToId && !isUuid(replyToId)) return { success: false, error: "The message you replied to is no longer available." }

  const scope = await chatScope(startupId, projectId)
  if (!scope.ok) return { success: false, error: scope.error }
  if (!roleCan(scope.role, "comment")) return { success: false, error: READ_ONLY }

  const limit = await checkRateLimit(scope.userId, "team_message", { maxRequests: 40, windowSeconds: 60 })
  if (!limit.allowed) return { success: false, error: limit.message }

  const base: MessageInsert = { startup_id: startupId, project_id: projectId, author_id: scope.userId, content: text }
  const insert = (columns: string, withReply: boolean) =>
    scope.supabase
      .from("team_messages")
      .insert(withReply && replyToId ? { ...base, reply_to_id: replyToId } : base)
      .select(columns)
      .single()

  const { data, error } = await withMessageColumns((columns) => insert(columns, columns === COLUMNS_WITH_REPLIES))
  if (error || !data) {
    if (isMissingSchema(error)) return { success: false, error: SETUP_REQUIRED }
    if (error?.message?.includes("reply_to_other_channel")) {
      return { success: false, error: "You can only reply to a message in the same channel." }
    }
    if (error) console.error("sendTeamMessage", error.message)
    return { success: false, error: "Your message could not be sent. Please try again." }
  }

  return { success: true, message: mapMessage(data as unknown as MessageRow) }
}

export async function editTeamMessage(messageId: string, content: string): Promise<Result<{ message: TeamMessage }>> {
  const text = cleanText(content, TEAM_MESSAGE_MAX_LENGTH + 1)
  if (!isUuid(messageId) || !text) return { success: false, error: "Message cannot be empty." }
  if (text.length > TEAM_MESSAGE_MAX_LENGTH) {
    return { success: false, error: `Messages can be up to ${TEAM_MESSAGE_MAX_LENGTH} characters.` }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Please sign in to continue." }

  const { data, error } = await withMessageColumns((columns) =>
    supabase.from("team_messages").update({ content: text }).eq("id", messageId).eq("author_id", user.id).select(columns),
  )
  const rows = (data ?? []) as unknown as MessageRow[]
  if (error || !rows.length) {
    if (error) console.error("editTeamMessage", error.message)
    return { success: false, error: "You can only edit your own messages." }
  }
  const reactions = await reactionsFor(supabase, [rows[0].id])
  return { success: true, message: mapMessage(rows[0], reactions.get(rows[0].id)) }
}

export async function deleteTeamMessage(messageId: string): Promise<Result> {
  if (!isUuid(messageId)) return { success: false, error: "Message not found." }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Please sign in to continue." }

  // RLS: authors delete their own messages; owner/admins may moderate any.
  const { data, error } = await supabase.from("team_messages").delete().eq("id", messageId).select("id")
  if (error || !data?.length) {
    if (error) console.error("deleteTeamMessage", error.message)
    return { success: false, error: "You do not have permission to delete that message." }
  }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/** Adds the reaction, or removes it if the person already reacted that way. */
export async function toggleTeamReaction(
  startupId: string,
  messageId: string,
  reaction: TeamReactionKey,
): Promise<Result<{ reactions: TeamReaction[] }>> {
  if (!isUuid(messageId) || !isTeamReactionKey(reaction)) return { success: false, error: "That reaction is not available." }
  const scope = await chatScope(startupId)
  if (!scope.ok) return { success: false, error: scope.error }
  if (!roleCan(scope.role, "comment")) return { success: false, error: READ_ONLY }

  const limit = await checkRateLimit(scope.userId, "team_reaction", { maxRequests: 60, windowSeconds: 60 })
  if (!limit.allowed) return { success: false, error: limit.message }

  const { data: removed, error: deleteError } = await scope.supabase
    .from("team_message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", scope.userId)
    .eq("reaction", reaction)
    .select("message_id")
  if (deleteError) {
    return { success: false, error: isMissingSchema(deleteError) ? SETUP_REQUIRED : "Could not update the reaction." }
  }

  if (!removed?.length) {
    const { error } = await scope.supabase
      .from("team_message_reactions")
      .insert({ message_id: messageId, startup_id: startupId, user_id: scope.userId, reaction })
    if (error && error.code !== "23505") {
      return { success: false, error: isMissingSchema(error) ? SETUP_REQUIRED : "Could not add the reaction." }
    }
  }

  const reactions = await reactionsFor(scope.supabase, [messageId])
  return { success: true, reactions: reactions.get(messageId) ?? [] }
}

// ---------------------------------------------------------------------------
// Unread tracking
// ---------------------------------------------------------------------------

/** Unread messages per channel key ("general" or a project id). Empty before the migration. */
export async function getTeamUnreadCounts(startupId: string): Promise<Record<string, number>> {
  if (!isUuid(startupId)) return {}
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_team_unread_counts", { target_startup_id: startupId })
  if (error || !data) return {}
  return Object.fromEntries(data.map((row) => [row.channel_key, row.unread]))
}

export async function markTeamChannelRead(startupId: string, projectId: string | null): Promise<void> {
  const scope = await chatScope(startupId, projectId)
  if (!scope.ok) return
  await scope.supabase
    .from("team_channel_reads")
    .upsert(
      { startup_id: startupId, user_id: scope.userId, channel_key: channelKeyOf(projectId), last_read_at: new Date().toISOString() },
      { onConflict: "startup_id,user_id,channel_key" },
    )
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchTeamMessages(startupId: string, query: string): Promise<Result<{ messages: TeamMessage[] }>> {
  // Strip characters with meaning in LIKE patterns.
  const term = cleanText(query, 80).replace(/[%_\\]/g, " ").trim()
  if (term.length < 2) return { success: true, messages: [] }
  const scope = await chatScope(startupId)
  if (!scope.ok) return { success: false, error: scope.error }

  const { data, error } = await withMessageColumns((columns) =>
    scope.supabase
      .from("team_messages")
      .select(columns)
      .eq("startup_id", startupId)
      .ilike("content", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(30),
  )
  if (error) return { success: false, error: isMissingSchema(error) ? SETUP_REQUIRED : "Search failed. Please try again." }
  return { success: true, messages: ((data ?? []) as unknown as MessageRow[]).map((row) => mapMessage(row)) }
}

// ---------------------------------------------------------------------------
// Message -> task
// ---------------------------------------------------------------------------

/** Turns a chat message into a task in Projects & Tasks (the channel's project, or the active one). */
export async function createTaskFromTeamMessage(messageId: string): Promise<Result<{ taskTitle: string; projectTitle: string }>> {
  if (!isUuid(messageId)) return { success: false, error: "Message not found." }
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return { success: false, error: ws.error }

  const { data: message } = await ws.supabase
    .from("team_messages")
    .select("id, project_id, content")
    .eq("id", messageId)
    .eq("startup_id", ws.startup.id)
    .maybeSingle()
  if (!message) return { success: false, error: "Message not found." }

  const projects = await getProjects(ws.startup.id)
  if (!projects.length) return { success: false, error: "Create a project first, in Projects & Tasks." }
  const project =
    projects.find((item) => item.id === message.project_id) ?? resolveActiveProject(projects, await readActiveProjectCookie())

  const firstLine = message.content.split("\n").find((line) => line.trim()) ?? message.content
  const title = firstLine.replace(/^@copilot\s*/i, "").replace(/\s+/g, " ").trim().slice(0, 200) || "Task from team chat"

  const { data: last } = await ws.supabase
    .from("tasks")
    .select("position")
    .eq("project_id", project.id)
    .order("position", { ascending: false })
    .limit(1)
  const { error } = await ws.supabase.from("tasks").insert({
    startup_id: ws.startup.id,
    project_id: project.id,
    title,
    description: `From team chat:\n\n${message.content}`.slice(0, 4000),
    source: "manual",
    position: (last?.[0]?.position ?? 0) + 1000,
    created_by: ws.user.id,
  })
  if (error) {
    return { success: false, error: isMissingSchema(error) ? SETUP_REQUIRED : "Could not create the task. Please try again." }
  }

  await logActivity(ws, { action: "task.created", entityType: "task", summary: `Added task "${title}" from team chat` })
  revalidatePath("/dashboard/projects")
  return { success: true, taskTitle: title, projectTitle: project.title }
}

// ---------------------------------------------------------------------------
// Copilot in the channel
// ---------------------------------------------------------------------------

/**
 * Brings the AI Copilot into the channel: it reads the business workspace and
 * the recent discussion, answers the question, and posts the reply for the
 * whole team (as a reply to the question when replies are available).
 */
export async function askCopilotInTeamChat(
  startupId: string,
  projectId: string | null,
  question: string,
  questionMessageId?: string | null,
): Promise<Result<{ message: TeamMessage }>> {
  const text = cleanText(question, 2000)
  if (!text) return { success: false, error: "Ask Copilot a question first." }
  if (questionMessageId && !isUuid(questionMessageId)) return { success: false, error: "This channel is not available." }

  const ws = await requireWorkspace("comment")
  if ("error" in ws) return { success: false, error: ws.error }
  // The chat always belongs to the active business; anything else is refused.
  if (ws.startup.id !== startupId || (projectId !== null && !isUuid(projectId))) {
    return { success: false, error: "This channel is not available." }
  }

  let projectLine = ""
  if (projectId) {
    const { data: project } = await ws.supabase
      .from("projects")
      .select("title, description")
      .eq("id", projectId)
      .eq("startup_id", startupId)
      .maybeSingle()
    if (!project) return { success: false, error: "This channel is not available." }
    projectLine = `This conversation is in the channel of the project "${project.title}"${project.description ? `: ${project.description.slice(0, 400)}` : ""}.`
  }

  let recentQuery = ws.supabase
    .from("team_messages")
    .select("author_id, content, is_copilot")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(20)
  recentQuery = projectId === null ? recentQuery.is("project_id", null) : recentQuery.eq("project_id", projectId)
  const [{ data: recent, error: recentError }, { data: roster }] = await Promise.all([
    recentQuery,
    ws.supabase.rpc("get_startup_team", { target_startup_id: startupId }),
  ])
  if (recentError) {
    return { success: false, error: isMissingSchema(recentError) ? SETUP_REQUIRED : "Could not load the discussion." }
  }
  const names = new Map((roster ?? []).map((member) => [member.user_id, member.full_name?.trim() || member.email.split("@")[0]]))

  const transcript = (recent ?? [])
    .slice()
    .reverse()
    .map((message) => `${message.is_copilot ? "Copilot" : (names.get(message.author_id ?? "") ?? "Team member")}: ${message.content.slice(0, 1200)}`)
    .join("\n")

  const context = await buildBusinessContext(ws, ["model", "plan", "finance", "validation", "execution", "memory"])
  const result = await runAi({
    feature: "team_chat.copilot",
    caller: ws.caller,
    gate: "copilot",
    system: baseSystemPrompt({
      role: "Anza Copilot, taking part in the team chat of this business",
      locale: ws.locale,
      extra: `Answer the latest question for the whole team. Be direct, practical and specific to this business, using its workspace data below; mention teammates by name when it helps. Use short Markdown: a one-line answer, up to 5 bullet points, then one concrete next step. Stay under 200 words.
${projectLine}
${context}`,
    }),
    messages: [
      {
        role: "user",
        content: `Recent team discussion:\n${fence("founder_input", transcript, 9000)}\n\nQuestion for Copilot:\n${fence("founder_input", text, 2000)}`,
      },
    ],
    maxTokens: 800,
    temperature: 0.5,
  })
  if (!result.ok) return { success: false, error: result.error }
  if (!result.text) return { success: false, error: "Copilot returned an empty answer. Please try again." }

  // Copilot messages have no human author, so only the server may write them,
  // and only after the membership and permission checks above.
  const base: MessageInsert = {
    startup_id: startupId,
    project_id: projectId,
    author_id: null,
    content: result.text.slice(0, TEAM_MESSAGE_MAX_LENGTH),
    is_copilot: true,
  }
  const { data, error } = await withMessageColumns((columns) =>
    getSupabaseAdmin()
      .from("team_messages")
      .insert(columns === COLUMNS_WITH_REPLIES && questionMessageId ? { ...base, reply_to_id: questionMessageId } : base)
      .select(columns)
      .single(),
  )
  if (error || !data) {
    if (error) console.error("askCopilotInTeamChat insert", error.message)
    return { success: false, error: "Copilot's answer could not be posted. Please try again." }
  }

  return { success: true, message: mapMessage(data as unknown as MessageRow) }
}
