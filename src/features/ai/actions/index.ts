"use server"

import { generateTextWithFallback } from "@/src/lib/ai-providers"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export type GenerateContentInput = {
  prompt: string
  /** Target social platform — affects tone and length. */
  platform?: "linkedin" | "twitter" | "instagram" | "general"
}

export type GenerateContentResult =
  | { success: true; content: string }
  | { success: false; error: string }

/**
 * Server Action: Generate marketing copy using OpenAI.
 * Verifies the user is authenticated before calling the API.
 */
export async function generateMarketingContent(
  input: GenerateContentInput,
): Promise<GenerateContentResult> {
  // --- Auth guard ---
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to generate content." }
  }

  if (!input.prompt || input.prompt.trim().length < 3) {
    return { success: false, error: "Please provide a topic or prompt." }
  }

  const platform = input.platform ?? "linkedin"

  const platformGuide: Record<string, string> = {
    linkedin:
      "Write a professional LinkedIn post (max 250 words). Use line breaks, emojis sparingly, and 3–5 relevant hashtags at the end.",
    twitter:
      "Write a punchy Twitter/X post under 280 characters. No hashtags unless essential.",
    instagram:
      "Write an engaging Instagram caption (max 150 words) with a strong opening line and 5–10 relevant hashtags at the end.",
    general:
      "Write a compelling social media post suitable for multiple platforms (max 200 words).",
  }

  try {
    const content = await generateTextWithFallback(
      `You are a world-class marketing copywriter specialising in African tech startups.
You write authentic, engaging content that resonates with both local African audiences and global investors.
Always write in first person from the perspective of a startup founder.
${platformGuide[platform]}`,
      [
        {
          role: "user",
          content: `Write a social media post about: ${input.prompt.trim()}`,
        },
      ],
    )

    if (!content.trim()) {
      return { success: false, error: "The AI returned an empty response. Please try again." }
    }

    return { success: true, content: content.trim() }
  } catch (err) {
    console.error("[generateMarketingContent] provider error:", err)
    return {
      success: false,
      error: "Failed to generate content. Please try again in a moment.",
    }
  }
}

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type AiChatResult =
  | { success: true; reply: string; model: string }
  | { success: false; error: string }

/**
 * Server Action: Stateless AI chat for the startup copilot.
 * Accepts a full message history so the caller maintains conversation state.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  systemContext?: string,
): Promise<AiChatResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Authentication required." }
  }

  if (!messages.length) {
    return { success: false, error: "No messages provided." }
  }

  const systemPrompt = systemContext
    ? systemContext
    : `You are Startup Copilot, an expert AI advisor for early-stage African startup founders.
You provide actionable, context-aware advice on product development, fundraising, marketing, and operations.
Keep responses concise and practical. When you don't know something, say so clearly.`

  try {
    const reply = await generateTextWithFallback(
      systemPrompt,
      messages.map((m) => ({ role: m.role, content: m.content })),
    )

    if (!reply.trim()) {
      return { success: false, error: "The AI returned an empty response." }
    }

    return {
      success: true,
      reply: reply.trim(),
      model: "provider-fallback",
    }
  } catch (err) {
    console.error("[sendChatMessage] provider error:", err)
    return { success: false, error: "Failed to get a response. Please try again." }
  }
}
