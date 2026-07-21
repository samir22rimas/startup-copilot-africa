import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { supabaseAdmin } from "@/src/lib/supabase/admin"
import type { Database } from "@/src/lib/database.types"

type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"]
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"]

/**
 * Fetch all conversations for a startup, ordered newest first.
 */
export async function getConversations(startupId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("startup_id", startupId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[getConversations]", error.message)
    return []
  }
  return data ?? []
}

/**
 * Create a new conversation for a startup.
 */
export async function createConversation(startupId: string, title?: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const payload: ConversationInsert = {
    startup_id: startupId,
    created_by: user.id,
    title: title ?? null,
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("[createConversation]", error.message)
    return null
  }
  return data
}

/**
 * Fetch all messages in a conversation, oldest first.
 */
export async function getMessages(conversationId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[getMessages]", error.message)
    return []
  }
  return data ?? []
}

/**
 * Persist a user message (RLS-safe — uses the session client).
 */
export async function saveUserMessage(conversationId: string, content: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const payload: MessageInsert = {
    conversation_id: conversationId,
    author_id: user.id,
    role: "user",
    content,
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("[saveUserMessage]", error.message)
    return null
  }
  return data
}

/**
 * Persist an assistant message using the admin client.
 * Required because RLS only allows user-role inserts via auth.uid().
 */
export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  model: string,
  tokenCount?: number,
) {
  const payload: MessageInsert = {
    conversation_id: conversationId,
    author_id: null,
    role: "assistant",
    content,
    model,
    token_count: tokenCount ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("[saveAssistantMessage]", error.message)
    return null
  }
  return data
}
