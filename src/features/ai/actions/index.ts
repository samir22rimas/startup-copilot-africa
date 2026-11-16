"use server"

import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAi } from "@/src/lib/ai/service"
import { cleanText } from "@/src/lib/validation"
import { requireWorkspace } from "@/src/lib/workspace"

const MAX_PROMPT_LENGTH = 1000

const CONTENT_TYPES = [
  "social_caption",
  "linkedin_post",
  "marketing_email",
  "product_description",
  "ad_copy",
  "campaign_brief",
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

const CONTENT_GUIDE: Record<ContentType, string> = {
  social_caption:
    "Write a short social media caption (max 80 words) for Facebook, Instagram or a WhatsApp status, with a clear call to action. Add 3 to 5 relevant hashtags on the last line.",
  linkedin_post:
    "Write a professional LinkedIn post (max 220 words) in the founder's first-person voice. Use short paragraphs and end with 3 relevant hashtags.",
  marketing_email:
    "Write a marketing email: a subject line (max 60 characters) on the first line prefixed with 'Subject:', then a body under 180 words with one clear call to action.",
  product_description:
    "Write a product or service description (80 to 130 words): what it is, who it is for, the main benefit, and how to get it. Plain and concrete.",
  ad_copy:
    "Write advertising copy in three variants. For each variant give a headline (max 8 words), one or two lines of body text and a call to action.",
  campaign_brief:
    "Write a one-page campaign brief with these headings: Objective, Audience, Key message, Channels, Content needed, Timeline, How we measure success. Keep each part to a few lines.",
}

export type GenerateContentInput = {
  prompt: string
  type?: ContentType
  /** @deprecated use `type`. Kept for older callers. */
  platform?: "linkedin" | "twitter" | "instagram" | "general"
}

export type GenerateContentResult =
  | { success: true; content: string }
  | { success: false; error: string }

/**
 * Generates marketing copy for the active business, in the user's language,
 * using the business's own context (model, plan, validation notes).
 */
export async function generateMarketingContent(input: GenerateContentInput): Promise<GenerateContentResult> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return { success: false, error: ws.error }

  const prompt = cleanText(input?.prompt, MAX_PROMPT_LENGTH + 1)
  if (prompt.length < 3) return { success: false, error: "Please provide a topic or prompt." }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { success: false, error: `Prompts can be up to ${MAX_PROMPT_LENGTH} characters.` }
  }

  const type: ContentType = CONTENT_TYPES.includes(input.type as ContentType)
    ? (input.type as ContentType)
    : input.platform === "linkedin"
      ? "linkedin_post"
      : "social_caption"

  const context = await buildBusinessContext(ws, ["model", "validation"])

  const result = await runAi({
    feature: `marketing.content.${type}`,
    caller: ws.caller,
    system: baseSystemPrompt({
      role: "a marketing copywriter for small businesses and startups in Africa",
      locale: ws.locale,
      extra: `${CONTENT_GUIDE[type]}
Write for this business's real customers and country: natural local tone, local currency, and the payment methods customers actually use where relevant.
Do not invent testimonials, customer numbers, awards, discounts or prices. If a detail is needed and unknown, leave a clearly marked placeholder in [square brackets].
Reply with the copy only — no preamble and no explanation.`,
    }),
    messages: [{ role: "user", content: `${context}\n\nTopic from the founder:\n${fence("founder_input", prompt, MAX_PROMPT_LENGTH)}` }],
    maxTokens: 900,
    temperature: 0.7,
  })

  if (!result.ok) return { success: false, error: result.error }
  if (!result.text) return { success: false, error: "The AI returned an empty response. Please try again." }
  return { success: true, content: result.text }
}
