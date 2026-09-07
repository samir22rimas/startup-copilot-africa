"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

import { z } from "zod"
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/src/lib/rate-limiter"

export type FeedbackCategory = "bug" | "feature" | "improvement" | "other"

const feedbackSchema = z.object({
  category: z.enum(["bug", "feature", "improvement", "other"]),
  message: z.string().trim().min(3, "Feedback message must be at least 3 characters.").max(3000, "Message exceeds 3000 characters limit."),
  rating: z.number().int().min(1).max(5).optional(),
  pageUrl: z.string().max(500).optional(),
})

export async function submitUserFeedback(formData: {
  category: FeedbackCategory
  message: string
  rating?: number
  pageUrl?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to submit feedback." }
  }

  const rateLimit = await checkAiRateLimit(user.id)
  if (!rateLimit.allowed) {
    return { success: false, error: AI_RATE_LIMIT_MESSAGE }
  }

  const parsed = feedbackSchema.safeParse(formData)
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid feedback data."
    return { success: false, error: errorMsg }
  }

  const { category, message, rating, pageUrl } = parsed.data

  const { error } = await supabase.from("user_feedback").insert({
    user_id: user.id,
    category,
    message,
    rating: rating || null,
    page_url: pageUrl || null,
  })

  if (error) {
    console.error("Error submitting feedback:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard")
  return { success: true }
}
