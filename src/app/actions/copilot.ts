"use server"

import { revalidatePath } from "next/cache"

import { getProjects } from "@/src/features/business/services/project.service"
import { readActiveProjectCookie, resolveActiveProject } from "@/src/lib/active-project"
import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt } from "@/src/lib/ai/guard"
import { featureLockedMessage, runAiStructured } from "@/src/lib/ai/service"
import {
  COPILOT_MODE_CONFIG,
  COPILOT_REPLY_SHAPE,
  copilotReplySchema,
  isCopilotMode,
  readStoredActions,
  type CopilotMode,
  type StoredCopilotAction,
} from "@/src/lib/copilot"
import type { Json } from "@/src/lib/database.types"
import type { MemoryKind, MemoryRow } from "@/src/lib/database.v2.types"
import { addDays } from "@/src/lib/execution"
import { roleCan } from "@/src/lib/permissions"
import { planHasFeature } from "@/src/lib/plans"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { MAX_CHAT_MESSAGE_LENGTH, cleanText, isUuid } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult, type Workspace } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"

const PATH = "/dashboard/copilot"
const HISTORY_LIMIT = 24
const MAX_CONVERSATIONS = 100

export interface CopilotConversation {
  id: string
  title: string | null
  mode: CopilotMode
  updatedAt: string
}

export interface CopilotMessage {
  id: string
  role: "user" | "assistant"
  content: string
  actions: StoredCopilotAction[]
  createdAt: string
}

export type MemoryItem = Pick<MemoryRow, "id" | "kind" | "content" | "rationale" | "source" | "pinned" | "created_at">

const MEMORY_COLUMNS = "id, kind, content, rationale, source, pinned, created_at"

/** A Copilot conversation the signed-in user started in the active business. */
async function ownConversation(ws: Workspace, conversationId: string) {
  if (!isUuid(conversationId)) return null
  const { data } = await ws.supabase
    .from("conversations")
    .select("id, title, mode, updated_at")
    .eq("id", conversationId)
    .eq("startup_id", ws.startup.id)
    .eq("created_by", ws.user.id)
    .eq("kind", "copilot")
    .is("archived_at", null)
    .maybeSingle()
  return data
}

export async function listCopilotConversations(): Promise<CopilotConversation[]> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  const { data } = await ws.supabase
    .from("conversations")
    .select("id, title, mode, updated_at")
    .eq("startup_id", ws.startup.id)
    .eq("created_by", ws.user.id)
    .eq("kind", "copilot")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(MAX_CONVERSATIONS)
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    mode: isCopilotMode(row.mode) ? row.mode : "advisor",
    updatedAt: row.updated_at,
  }))
}

export async function getCopilotMessages(conversationId: string): Promise<CopilotMessage[]> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  if (!(await ownConversation(ws, conversationId))) return []
  const { data } = await ws.supabase
    .from("messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(400)
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    actions: row.role === "assistant" ? readStoredActions(row.metadata) : [],
    createdAt: row.created_at,
  }))
}

export async function deleteCopilotConversation(conversationId: string): Promise<ActionResult> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return fail(ws.error)
  if (!(await ownConversation(ws, conversationId))) return fail("That conversation is not available.")
  const { error } = await ws.supabase.from("conversations").delete().eq("id", conversationId).eq("created_by", ws.user.id)
  if (error) return fail("Could not delete the conversation.")
  revalidatePath(PATH)
  return { success: true }
}

/**
 * Sends a message and returns Copilot's reply. Pass `conversationId: null`
 * to start a new conversation.
 */
export async function sendCopilotMessage(input: {
  conversationId: string | null
  mode: string
  text: string
}): Promise<ActionResult<{ conversation: CopilotConversation; userMessage: CopilotMessage; reply: CopilotMessage }>> {
  const text = cleanText(input?.text, MAX_CHAT_MESSAGE_LENGTH + 1)
  if (!text) return fail("Type a message first.")
  if (text.length > MAX_CHAT_MESSAGE_LENGTH) return fail(`Messages can be up to ${MAX_CHAT_MESSAGE_LENGTH} characters.`)
  const mode: CopilotMode = isCopilotMode(input.mode) ? input.mode : "advisor"

  const ws = await requireWorkspace("view")
  if ("error" in ws) return fail(ws.error)
  if (mode !== "advisor" && !ws.unlimited && !planHasFeature(ws.tier, "copilot_specialists")) {
    return fail(featureLockedMessage("copilot_specialists"))
  }

  // 1. Conversation
  let conversation = input.conversationId ? await ownConversation(ws, input.conversationId) : null
  if (input.conversationId && !conversation) return fail("That conversation is not available.")
  if (!conversation) {
    const { count } = await ws.supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("startup_id", ws.startup.id)
      .eq("created_by", ws.user.id)
      .eq("kind", "copilot")
    if ((count ?? 0) >= MAX_CONVERSATIONS) return fail("You have many conversations. Delete an old one to start another.")
    const { data, error } = await ws.supabase
      .from("conversations")
      .insert({
        startup_id: ws.startup.id,
        created_by: ws.user.id,
        title: text.slice(0, 80),
        kind: "copilot",
        mode,
      })
      .select("id, title, mode, updated_at")
      .maybeSingle()
    if (error || !data) return fail("Could not start the conversation. Please try again.")
    conversation = data
  }

  // 2. History (before this message), then store the user's message
  const { data: recent } = await ws.supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT)
  const history = (recent ?? [])
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content.slice(0, 4000) }))

  const { data: userRow, error: userError } = await ws.supabase
    .from("messages")
    .insert({ conversation_id: conversation.id, author_id: ws.user.id, role: "user", content: text })
    .select("id, created_at")
    .maybeSingle()
  if (userError || !userRow) return fail("Could not save your message. Please try again.")

  // 3. Context for this mode. Memory is a paid capability.
  const config = COPILOT_MODE_CONFIG[mode]
  const parts = config.context.filter((part) => part !== "memory" || ws.unlimited || planHasFeature(ws.tier, "copilot_memory"))
  const context = await buildBusinessContext(ws, parts)
  const canAct = roleCan(ws.role, "edit")

  const result = await runAiStructured({
    feature: `copilot.${mode}`,
    caller: ws.caller,
    gate: "copilot",
    system: baseSystemPrompt({
      role: config.role,
      locale: ws.locale,
      extra: `${config.focus}

How to answer:
- Lead with a direct answer, then the reasoning. Use short paragraphs, bullet lists and **bold** lead-ins; keep it under about 250 words unless the founder asks for depth.
- Use the business data below. Refer to their actual tasks, numbers, evidence and decisions, and say when something you would need is missing from the workspace (and where in Anza to add it).
- When the founder asks about progress, check the open tasks and milestones for overdue or blocked work and name them.
- End with one concrete next step when it helps.
${canAct ? "" : "- This person has read-only access: do not propose actions (return an empty actions array).\n"}
${context}`,
    }),
    messages: [...history, { role: "user", content: text }],
    schema: copilotReplySchema,
    shape: COPILOT_REPLY_SHAPE,
    maxTokens: 1500,
    temperature: 0.5,
  })
  if (!result.ok) return fail(result.error)

  const actions: StoredCopilotAction[] = canAct ? result.data.actions.map((action) => ({ ...action, applied: false })) : []

  // 4. Store the reply. Assistant messages can only be written by the server.
  const { data: replyRow, error: replyError } = await getSupabaseAdmin()
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: result.data.reply,
      model: result.model,
      metadata: { actions, mode } as unknown as Json,
    })
    .select("id, created_at")
    .maybeSingle()
  if (replyError || !replyRow) console.error("[copilot] reply not stored:", replyError?.message)

  await ws.supabase.from("conversations").update({ mode }).eq("id", conversation.id)

  const now = new Date().toISOString()
  return {
    success: true,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      mode,
      updatedAt: now,
    },
    userMessage: { id: userRow.id, role: "user", content: text, actions: [], createdAt: userRow.created_at },
    reply: {
      id: replyRow?.id ?? `local-${Date.now()}`,
      role: "assistant",
      content: result.data.reply,
      actions,
      createdAt: replyRow?.created_at ?? now,
    },
  }
}

/**
 * Carries out ONE action Copilot proposed, after a person clicked it.
 * The action is re-read from the stored message (never trusted from the
 * browser), the caller must have edit rights, and it can only run once.
 */
export async function applyCopilotAction(input: {
  conversationId: string
  messageId: string
  index: number
}): Promise<ActionResult> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  if (!isUuid(input?.messageId) || !Number.isInteger(input.index)) return fail("That suggestion is not available.")
  if (!(await ownConversation(ws, input.conversationId))) return fail("That suggestion is not available.")

  const { data: message } = await ws.supabase
    .from("messages")
    .select("id, metadata")
    .eq("id", input.messageId)
    .eq("conversation_id", input.conversationId)
    .eq("role", "assistant")
    .maybeSingle()
  const actions = readStoredActions(message?.metadata)
  const action = actions[input.index]
  if (!message || !action) return fail("That suggestion is not available.")
  if (action.applied) return fail("This suggestion was already added.")

  if (action.type === "task" || action.type === "milestone") {
    const projects = await getProjects(ws.startup.id)
    if (!projects.length) return fail("Create a project first, in Projects & Tasks.")
    const project = resolveActiveProject(projects, await readActiveProjectCookie())
    const due = action.dueInDays ? addDays(action.dueInDays) : null

    if (action.type === "task") {
      const { data: last } = await ws.supabase
        .from("tasks")
        .select("position")
        .eq("project_id", project.id)
        .order("position", { ascending: false })
        .limit(1)
      const { error } = await ws.supabase.from("tasks").insert({
        startup_id: ws.startup.id,
        project_id: project.id,
        title: action.title,
        priority: action.priority,
        due_date: due,
        source: "copilot",
        position: (last?.[0]?.position ?? 0) + 1000,
        created_by: ws.user.id,
      })
      if (error) return fail("Could not add the task. Please try again.")
      await logActivity(ws, { action: "task.created", entityType: "task", summary: `Added task "${action.title}" from Copilot` })
    } else {
      const { count } = await ws.supabase.from("milestones").select("id", { count: "exact", head: true }).eq("project_id", project.id)
      const { error } = await ws.supabase.from("milestones").insert({
        startup_id: ws.startup.id,
        project_id: project.id,
        title: action.title,
        due_date: due,
        position: (count ?? 0) + 1,
        created_by: ws.user.id,
      })
      if (error) return fail("Could not add the milestone. Please try again.")
      await logActivity(ws, { action: "milestone.created", entityType: "milestone", summary: `Added milestone "${action.title}" from Copilot` })
    }
    revalidatePath("/dashboard/projects")
  } else {
    if (!ws.unlimited && !planHasFeature(ws.tier, "copilot_memory")) return fail(featureLockedMessage("copilot_memory"))
    const { error } = await ws.supabase.from("business_memory").insert({
      startup_id: ws.startup.id,
      kind: action.type === "decision" ? "decision" : action.kind,
      content: action.content,
      rationale: action.type === "decision" ? action.rationale || null : null,
      source: "copilot",
      created_by: ws.user.id,
    })
    if (error) return fail("Could not save this. Please try again.")
    if (action.type === "decision") {
      await logActivity(ws, { action: "decision.recorded", entityType: "memory", summary: `Recorded decision: ${action.content}` })
    }
  }

  // Mark as applied so it cannot be run twice. Messages are immutable for
  // users, so this bookkeeping write uses the service role after the checks above.
  const updated = actions.map((item, index) => (index === input.index ? { ...item, applied: true } : item))
  const metadata = { ...((message.metadata as Record<string, Json>) ?? {}), actions: updated as unknown as Json }
  await getSupabaseAdmin().from("messages").update({ metadata } as never).eq("id", message.id)

  revalidatePath("/dashboard")
  return { success: true }
}

// --- Business memory ----------------------------------------------------------

export async function listMemory(): Promise<MemoryItem[]> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  const { data } = await ws.supabase
    .from("business_memory")
    .select(MEMORY_COLUMNS)
    .eq("startup_id", ws.startup.id)
    .is("archived_at", null)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200)
  return (data ?? []) as MemoryItem[]
}

const MEMORY_KINDS: MemoryKind[] = ["fact", "decision", "goal", "preference", "risk"]

export async function addMemory(input: {
  kind: string
  content: string
  rationale?: string
}): Promise<ActionResult<{ item: MemoryItem }>> {
  const content = cleanText(input?.content, 1000)
  if (content.length < 3) return fail("Write what Copilot should remember.")
  if (!MEMORY_KINDS.includes(input.kind as MemoryKind)) return fail("Choose a type.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  if (!ws.unlimited && !planHasFeature(ws.tier, "copilot_memory")) return fail(featureLockedMessage("copilot_memory"))

  const { data, error } = await ws.supabase
    .from("business_memory")
    .insert({
      startup_id: ws.startup.id,
      kind: input.kind as MemoryKind,
      content,
      rationale: cleanText(input.rationale, 1000) || null,
      source: "user",
      created_by: ws.user.id,
    })
    .select(MEMORY_COLUMNS)
    .maybeSingle()
  if (error || !data) return fail("Could not save this. Please try again.")
  if (input.kind === "decision") {
    await logActivity(ws, { action: "decision.recorded", entityType: "memory", entityId: data.id, summary: `Recorded decision: ${content}` })
  }
  revalidatePath(PATH)
  return { success: true, item: data as MemoryItem }
}

export async function updateMemoryPin(id: string, pinned: boolean): Promise<ActionResult> {
  if (!isUuid(id)) return fail("That item is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase
    .from("business_memory")
    .update({ pinned: Boolean(pinned) }, { count: "exact" })
    .eq("id", id)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not update this item.")
  return { success: true }
}

export async function deleteMemory(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("That item is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase
    .from("business_memory")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not delete this item.")
  revalidatePath(PATH)
  return { success: true }
}
